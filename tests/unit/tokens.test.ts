import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");

/** Reads `--name: #hex;` pairs from the first block that starts with `selector {`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = {
  light: tokens(":root"),
  dark: tokens(':root[data-theme="dark"]'),
};

describe("UX4G design tokens", () => {
  it("uses the UX4G 3.0 primary in light and the lighter primary in dark", () => {
    expect(THEMES.light.accent).toBe("#4a2bc2");
    expect(THEMES.dark.accent).toBe("#a391ff");
  });

  it("keeps the system-dark block identical to the explicit dark block", () => {
    expect(tokens(':root:not([data-theme="light"])')).toEqual(THEMES.dark);
  });

  for (const [name, t] of Object.entries(THEMES)) {
    describe(name, () => {
      it.each([
        ["ink", "paper"],
        ["ink", "surface"],
        ["muted", "surface"],
        ["muted", "paper"],
        ["accent", "surface"],
        ["accent-ink", "accent"],
        ["danger", "surface"],
        ["warn", "surface"],
        ["ok", "surface"],
        ["saffron", "surface"],
        ["saffron", "paper"],
        ["bar-ink", "bar"],
      ])("%s on %s meets WCAG AA for text (4.5:1)", (fg, bg) => {
        expect(t[fg], `--${fg}`).toBeDefined();
        expect(t[bg], `--${bg}`).toBeDefined();
        expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });

      it("form-field borders reach 3:1 against the surface (WCAG 1.4.11)", () => {
        expect(contrast(t.field, t.surface)).toBeGreaterThanOrEqual(3);
      });
    });
  }
});
