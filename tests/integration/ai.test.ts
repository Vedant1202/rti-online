import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { AiError, aiEnabled, getAiModel, setAiModelForTests, withTimeout } from "@/lib/ai/gemini";
import { runAi, AI_HOURLY_LIMIT } from "@/lib/ai/limits";
import type { Db } from "@/lib/db/client";

const t0 = new Date("2026-10-11T10:00:00Z");
const mins = (m: number) => new Date(t0.getTime() + m * 60_000);

describe("Gemini client", () => {
  const savedKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
    setAiModelForTests(null);
  });

  it("is switched off without GEMINI_API_KEY", () => {
    delete process.env.GEMINI_API_KEY;
    expect(aiEnabled()).toBe(false);
    expect(() => getAiModel()).toThrow(AiError);
    try {
      getAiModel();
    } catch (e) {
      expect((e as AiError).code).toBe("disabled");
    }
  });

  it("is on with a key", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(aiEnabled()).toBe(true);
  });

  it("times out slow calls with a clear error", async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 50)).rejects.toMatchObject({ code: "timeout" });
    await expect(withTimeout(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });
});

describe("per-user limit", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
    setAiModelForTests({ generateJson: async () => ({ ok: true }) as never });
  });
  afterEach(() => setAiModelForTests(null));

  it(`allows ${AI_HOURLY_LIMIT} calls an hour, then says when to try again`, async () => {
    for (let i = 0; i < AI_HOURLY_LIMIT; i++) {
      await runAi(s.citizen, "rewrite", mins(i), async (model) => model.generateJson({ system: "", prompt: "", schema: {} }));
    }
    await expect(runAi(s.citizen, "rewrite", mins(30), async () => 1)).rejects.toMatchObject({
      code: "rate_limited",
      retryAfterMinutes: 30,
    });
    // Another user is unaffected, and the first is allowed again an hour after their first call.
    await expect(runAi(s.other, "rewrite", mins(30), async () => 1)).resolves.toBe(1);
    await expect(runAi(s.citizen, "rewrite", mins(61), async () => 2)).resolves.toBe(2);
  });
});
