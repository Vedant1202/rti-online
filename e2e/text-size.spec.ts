import { test, expect } from "@playwright/test";
import { as, BASE_URL } from "./helpers";

const rootFontSize = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

test("A+ makes text larger and the choice survives a reload", async ({ page }) => {
  await page.goto("/");
  expect(await rootFontSize(page)).toBe("16px");
  const larger = page.getByRole("button", { name: "Larger text" });
  await larger.click();
  await expect(larger).toHaveAttribute("aria-pressed", "true");
  expect(await rootFontSize(page)).toBe("20px");

  await page.reload();
  expect(await rootFontSize(page)).toBe("20px");
  await expect(page.getByRole("button", { name: "Larger text" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Smaller text" }).click();
  expect(await rootFontSize(page)).toBe("14px");
  await page.getByRole("button", { name: "Default text size" }).click();
  expect(await rootFontSize(page)).toBe("16px");
});

test("at 125% text and 375px, key pages have no horizontal scroll", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  const page = await as(browser, `big-text-${Date.now()}@example.com`, { width: 375, height: 812 });
  await page.context().addCookies([{ name: "rti_text", value: "lg", url: BASE_URL }]);
  for (const path of ["/", "/requests", "/requests/new", "/stats", "/help"]) {
    await page.goto(path);
    expect(await rootFontSize(page)).toBe("20px");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});
