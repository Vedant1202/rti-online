import { describe, it, expect } from "vitest";
import { TEXT_SCALE, parseLang, parseTextSize, prefsScript } from "@/lib/prefs";

describe("text size preference", () => {
  it("reads sm, md or lg from the cookie, defaulting to md", () => {
    expect(parseTextSize("sm")).toBe("sm");
    expect(parseTextSize("lg")).toBe("lg");
    expect(parseTextSize("md")).toBe("md");
    expect(parseTextSize(undefined)).toBe("md");
    expect(parseTextSize("xxl")).toBe("md");
  });

  it("maps A−, A and A+ to 87.5%, 100% and 125%", () => {
    expect(TEXT_SCALE).toEqual({ sm: "87.5%", md: "100%", lg: "125%" });
  });
});

describe("language preference", () => {
  it("reads en or hi from the cookie, defaulting to English", () => {
    expect(parseLang("hi")).toBe("hi");
    expect(parseLang("en")).toBe("en");
    expect(parseLang(undefined)).toBe("en");
    expect(parseLang("fr")).toBe("en");
  });
});

describe("pre-paint script", () => {
  function run(cookie: string) {
    const el = { dataset: {} as Record<string, string>, lang: "en" };
    new Function("document", prefsScript)({ cookie, documentElement: el });
    return el;
  }

  it("applies theme, text size and language from cookies before the first paint", () => {
    const el = run("rti_theme=dark; rti_text=lg; rti_lang=hi");
    expect(el.dataset).toEqual({ theme: "dark", text: "lg" });
    expect(el.lang).toBe("hi");
  });

  it("leaves the defaults alone when there are no cookies", () => {
    const el = run("");
    expect(el.dataset).toEqual({});
    expect(el.lang).toBe("en");
  });

  it("ignores unknown values", () => {
    const el = run("rti_theme=purple; rti_text=huge; rti_lang=fr");
    expect(el.dataset).toEqual({});
    expect(el.lang).toBe("en");
  });
});
