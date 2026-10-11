import { z } from "zod";
import { AiError, type AiErrorCode } from "@/lib/ai/gemini";

const AI_STATUS: Record<AiErrorCode, number> = {
  disabled: 503,
  timeout: 504,
  quota: 429,
  rate_limited: 429,
  blocked: 422,
  failed: 502,
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = "You don't have access to this.") => new HttpError(403, msg);
export const notFound = (msg = "Not found.") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/** Wraps a route handler: Zod errors → 400, HttpError → its status, anything else → 500. */
export function route<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      if (err instanceof AiError) {
        return Response.json({ error: err.message, code: err.code }, { status: AI_STATUS[err.code] });
      }
      if (err instanceof z.ZodError) {
        return Response.json({ error: z.prettifyError(err) }, { status: 400 });
      }
      console.error(err);
      return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Send a JSON body.");
  }
  return schema.parse(body);
}
