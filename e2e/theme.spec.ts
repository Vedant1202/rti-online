import { test, expect, type Page } from "@playwright/test";

const LIGHT_PAPER = "rgb(250, 250, 250)"; // --paper #fafafa
const DARK_PAPER = "rgb(15, 14, 23)"; // --paper #0f0e17
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.use({ colorScheme: "dark" });

test("the theme toggle switches between system, light and dark, and remembers the choice", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toContainText("System");
  expect(await bodyBg(page)).toBe(DARK_PAPER); // follows the dark device setting

  await toggle.click();
  await expect(toggle).toContainText("Light");
  expect(await bodyBg(page)).toBe(LIGHT_PAPER);

  await page.reload(); // rendered light by the server from the cookie, no flash
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bodyBg(page)).toBe(LIGHT_PAPER);

  await page.getByTestId("theme-toggle").click();
  await expect(page.getByTestId("theme-toggle")).toContainText("Dark");
  expect(await bodyBg(page)).toBe(DARK_PAPER);

  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(await bodyBg(page)).toBe(DARK_PAPER);
});
