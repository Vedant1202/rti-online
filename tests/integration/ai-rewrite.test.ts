import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seeded } from "../helpers/fixtures";
import { setAiModelForTests, type AiModel } from "@/lib/ai/gemini";
import { rewriteFormally, mustKeep } from "@/lib/ai/rewrite";
import type { Db } from "@/lib/db/client";

const now = new Date("2026-10-11T10:00:00Z");

function fake(replies: string[]): AiModel & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    async generateJson<T>({ prompt }: { prompt: string }) {
      prompts.push(prompt);
      return { rewritten: replies.shift() ?? "" } as T;
    },
  };
}

describe("formal rewrite", () => {
  let db: Db;
  let s: Awaited<ReturnType<typeof seeded>>;
  beforeEach(async () => {
    db = await createTestDb();
    s = await seeded(db);
  });
  afterEach(() => setAiModelForTests(null));

  it("lists the details that must survive: numbers, file numbers, dates and placeholders", () => {
    expect(mustKeep("my pension PPO/2019/4471 since 3 Oct 2026, ref [reference number]")).toEqual([
      "PPO/2019/4471",
      "3",
      "2026",
      "[reference number]",
    ]);
  });

  it("returns the rewrite when every detail is kept", async () => {
    const model = fake(["Under section 6(1) of the RTI Act, I request the status of PPO/2019/4471, pending since 3 October 2026."]);
    setAiModelForTests(model);
    const r = await rewriteFormally(s.citizen, { text: "whats up with my PPO/2019/4471 since 3 oct 2026??" }, now);
    expect(r.rewritten).toContain("PPO/2019/4471");
    expect(model.prompts[0]).toContain("PPO/2019/4471");
  });

  it("retries once when a detail is dropped, then succeeds", async () => {
    const model = fake(["I request the status of my pension.", "I request the status of PPO/2019/4471."]);
    setAiModelForTests(model);
    const r = await rewriteFormally(s.citizen, { text: "status of PPO/2019/4471 pls" }, now);
    expect(r.rewritten).toBe("I request the status of PPO/2019/4471.");
    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toContain("PPO/2019/4471");
  });

  it("fails clearly if the detail is dropped twice", async () => {
    setAiModelForTests(fake(["I request the status.", "I request the status again."]));
    await expect(rewriteFormally(s.citizen, { text: "status of PPO/2019/4471" }, now)).rejects.toThrow(/couldn't keep/);
  });

  it("keeps Hindi in Hindi", async () => {
    const model = fake(["I request the status of PPO 4471.", "सूचना का अधिकार अधिनियम की धारा 6(1) के अंतर्गत, PPO 4471 की स्थिति बताने का अनुरोध है।"]);
    setAiModelForTests(model);
    const r = await rewriteFormally(s.citizen, { text: "मेरी पेंशन PPO 4471 का क्या हुआ" }, now);
    expect(r.rewritten).toMatch(/[ऀ-ॿ]/);
    expect(model.prompts).toHaveLength(2);
  });

  it("only citizens can use it", async () => {
    setAiModelForTests(fake(["x"]));
    await expect(rewriteFormally(await s.officer("DOPPW", "cpio1"), { text: "x" }, now)).rejects.toThrow();
  });
});
