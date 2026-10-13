import { test, expect } from "@playwright/test";

test("headings use the Poppins display face and body text stays Noto Sans", async ({ page }) => {
  await page.goto("/");
  const h1 = await page.locator("main h1").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1).toMatch(/Poppins/);
  const body = await page.locator("main p").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(body).toMatch(/Noto Sans/);
  expect(body).not.toMatch(/Poppins/);
});

test("primary buttons use the brand gradient and cards have rounded, shadowed corners", async ({ page }) => {
  await page.goto("/");
  const btn = page.locator("main a.btn").first();
  expect(await btn.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/linear-gradient/);
  const card = page.locator("main .card").first();
  const style = await card.evaluate((el) => ({ radius: getComputedStyle(el).borderTopLeftRadius, shadow: getComputedStyle(el).boxShadow }));
  expect(style.radius).toBe("16px");
  expect(style.shadow).not.toBe("none");
});
