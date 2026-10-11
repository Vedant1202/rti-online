
export type AiErrorCode = "disabled" | "timeout" | "quota" | "blocked" | "failed" | "rate_limited";

const MESSAGES: Record<AiErrorCode, string> = {
  disabled: "AI features are switched off on this site.",
  timeout: "The AI took too long to answer. Try again.",
  quota: "The AI service is busy right now. Try again in a minute.",
  blocked: "The AI couldn't process this text. Edit it and try again.",
  failed: "The AI couldn't answer. Try again.",
  rate_limited: "You've used the AI features a lot in the last hour.",
};

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message = MESSAGES[code],
    public retryAfterMinutes?: number,
  ) {
    super(message);
  }
}

export type AiModel = {
  generateJson<T>(opts: { system: string; prompt: string; schema: Record<string, unknown> }): Promise<T>;
};

// Generous: a long formal rewrite can take a while on the free tier. The UI shows a loader meanwhile.
export const AI_TIMEOUT_MS = 40_000;

export function withTimeout<T>(promise: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AiError("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** True when GEMINI_API_KEY is set. Pages use this to show or hide the AI buttons. */
export function aiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) || override !== null;
}

let override: AiModel | null = null;
/** Tests inject a fake model; no real API calls are made in tests. */
export function setAiModelForTests(model: AiModel | null) {
  override = model;
}

/** Server-only Gemini client. The key never reaches the browser. */
export function getAiModel(): AiModel {
  if (override) return override;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("disabled");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  return {
    async generateJson<T>({ system, prompt, schema }: { system: string; prompt: string; schema: Record<string, unknown> }) {
      const { GoogleGenAI, ThinkingLevel } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const call = (lowThinking: boolean) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            // These are simple tasks: keep the model's "thinking" low so answers come back quickly.
            ...(lowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          },
        });
      let response;
      try {
        response = await withTimeout(
          call(true).catch((err) => {
            // Older models reject thinkingLevel: retry once with the model's default.
            if ((err as { status?: number }).status === 400) return call(false);
            throw err;
          }),
        );
      } catch (err) {
        const status = (err as { status?: number }).status;
        // Logged for diagnosis on the server only. The API key is never logged.
        console.error(`[ai] model=${model} status=${status ?? "-"} ${err instanceof AiError ? err.code : (err as Error).message}`.slice(0, 500));
        if (err instanceof AiError) throw err;
        throw new AiError(status === 429 ? "quota" : "failed");
      }
      if (response.promptFeedback?.blockReason) throw new AiError("blocked");
      const text = response.text;
      if (!text) {
        console.error(`[ai] model=${model} empty response, finishReason=${response.candidates?.[0]?.finishReason ?? "-"}`);
        throw new AiError("failed");
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AiError("failed");
      }
    },
  };
}
