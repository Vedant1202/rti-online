import authorityData from "@/data/authorities.json";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { setAiModelForTests, type AiModel } from "@/lib/ai/gemini";
import { recommendAuthority } from "@/lib/ai/suggest-authority";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-11T10:00:00Z");
const input = { subject: "Ticket refund", body: "My train ticket refund for PNR 4512398760 has not come." };

function fake(reply: (schema: Record<string, unknown>) => unknown): AiModel & { last?: { prompt: string; schema: Record<string, unknown> } } {
  const m: AiModel & { last?: { prompt: string; schema: Record<string, unknown> } } = {
    async generateJson<T>(opts: { prompt: string; schema: Record<string, unknown> }) {
      m.last = opts;
      return reply(opts.schema) as T;
    },
  };
  return m;
}

describe("recommended department", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });
  afterEach(() => setAiModelForTests(null));

  it("constrains the answer to real central authority IDs and returns the pick with a reason", async () => {
    const rail = await s.auth("MORLY");
    const model = fake(() => ({ authorityId: rail.id, reason: "Train ticket refunds are handled by the Ministry of Railways." }));
    setAiModelForTests(model);
    const r = await recommendAuthority(s.citizen, input, now);
    expect(r).toEqual({ authorityId: rail.id, reason: "Train ticket refunds are handled by the Ministry of Railways." });
    const ids = (model.last!.schema.properties as Record<string, { enum: string[] }>).authorityId.enum;
    expect(ids).toContain(rail.id);
    expect(ids).toContain("none");
    expect(ids).toHaveLength(authorityData.length + 1); // every seeded central authority + "none"
    expect(model.last!.prompt).toContain("Ministry of Railways");
    expect(model.last!.prompt).toContain("PNR 4512398760");
  });

  it("ignores an ID that isn't in the list, and 'none'", async () => {
    setAiModelForTests(fake(() => ({ authorityId: "00000000-0000-4000-8000-000000000000", reason: "x" })));
    expect(await recommendAuthority(s.citizen, input, now)).toEqual({ authorityId: null, reason: null });
    setAiModelForTests(fake(() => ({ authorityId: "none", reason: "State matter" })));
    expect(await recommendAuthority(s.citizen, input, now)).toEqual({ authorityId: null, reason: null });
  });
});
