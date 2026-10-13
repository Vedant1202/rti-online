import { describe, it, expect } from "vitest";
import { dictFor, fmt, plural } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { hi } from "@/lib/i18n/hi";

function leaves(obj: object, path = ""): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? leaves(v, `${path}${k}.`) : [[`${path}${k}`, v] as [string, unknown]],
  );
}

describe("dictionaries", () => {
  it("serves English by default", () => {
    expect(dictFor("en")).toBe(en);
    expect(dictFor("en").a11y.skip).toBe("Skip to content");
  });

  it("has a non-empty string for every English key", () => {
    for (const [key, value] of leaves(en)) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });
});

describe("Hindi dictionary", () => {
  const enLeaves = Object.fromEntries(leaves(en));
  const hiLeaves = Object.fromEntries(leaves(hi));
  // Names, codes and symbols that read the same in both languages.
  const SAME = new Set(["nav.brand", "card.cvcPlaceholder", "bar.english", "bar.hindi", "nav.roles.cpio", "help.topics.cpio.title"]);

  it("is what dictFor serves for hi", () => {
    expect(dictFor("hi")).toBe(hi);
  });

  it("has every English key, each with Hindi text", () => {
    expect(Object.keys(hiLeaves).sort()).toEqual(Object.keys(enLeaves).sort());
    for (const [key, value] of Object.entries(hiLeaves)) {
      expect((value as string).trim(), key).not.toBe("");
      if (!SAME.has(key)) expect(value, `${key} looks untranslated`).not.toBe(enLeaves[key]);
    }
  });

  it("keeps every {placeholder} the English text has", () => {
    for (const [key, value] of Object.entries(enLeaves)) {
      const names = [...(value as string).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      const hiNames = [...(hiLeaves[key] as string).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(hiNames, key).toEqual(names);
    }
  });

  it("uses the Indian Hindi locale for dates", () => {
    expect(hi.meta.locale).toBe("hi-IN");
    expect(en.meta.locale).toBe("en-IN");
  });
});

describe("fmt", () => {
  it("fills {placeholders} from the values", () => {
    expect(fmt("Pay {amount} for {regNo}", { amount: "₹10", regNo: "DOPAT/R/E/26/00001" })).toBe(
      "Pay ₹10 for DOPAT/R/E/26/00001",
    );
  });

  it("accepts numbers and leaves unknown placeholders visible", () => {
    expect(fmt("{n} days left, due {date}", { n: 3 })).toBe("3 days left, due {date}");
  });
});

describe("plural", () => {
  it("picks the singular for 1 and the plural otherwise, filling {n}", () => {
    expect(plural(1, "{n} day left", "{n} days left")).toBe("1 day left");
    expect(plural(4, "{n} day left", "{n} days left")).toBe("4 days left");
    expect(plural(0, "{n} day left", "{n} days left")).toBe("0 days left");
  });
});
