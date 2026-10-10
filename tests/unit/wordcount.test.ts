import { describe, it, expect } from "vitest";
import { countWords, overSoftLimit } from "@/lib/rti/wordcount";

describe("word count", () => {
  it("counts English words, ignoring punctuation", () => {
    expect(countWords("Please provide copies of file notings, dated 2024.")).toBe(8);
  });

  it("counts Hindi words", () => {
    expect(countWords("मेरी पेंशन फ़ाइल की स्थिति बताएं")).toBe(6);
    expect(countWords("कृपया PPO/2019/4471 की वर्तमान स्थिति दें।")).toBe(6);
  });

  it("counts mixed scripts and empty text", () => {
    expect(countWords("RTI आवेदन status")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });

  it("flags text over 500 words without blocking it", () => {
    expect(overSoftLimit("word ".repeat(500))).toBe(false);
    expect(overSoftLimit("word ".repeat(501))).toBe(true);
  });
});
