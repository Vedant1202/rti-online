import { describe, it, expect } from "vitest";
import { nextTheme, parseTheme } from "@/lib/theme";

describe("theme preference", () => {
  it("reads light, dark or system from the cookie, defaulting to system", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("purple")).toBe("system");
  });

  it("cycles system → light → dark → system", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});
