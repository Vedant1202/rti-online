import { describe, it, expect } from "vitest";
import { TEMPLATES, unfilledPlaceholders } from "@/lib/rti/templates";

describe("request templates", () => {
  it("has 4 to 6 templates, each with placeholders to fill", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(4);
    expect(TEMPLATES.length).toBeLessThanOrEqual(6);
    for (const t of TEMPLATES) expect(unfilledPlaceholders(t.body).length).toBeGreaterThan(0);
  });

  it("lists placeholders still in square brackets", () => {
    expect(unfilledPlaceholders("PPO [PPO number] dated [date], ref [PPO number]")).toEqual(["[PPO number]", "[date]"]);
    expect(unfilledPlaceholders("PPO 4471 dated 3 Oct")).toEqual([]);
  });
});
