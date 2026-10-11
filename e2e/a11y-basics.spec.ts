import { test, expect } from "@playwright/test";

test("Tab reaches 'Skip to content' first and it jumps to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("an info button opens and closes by keyboard and returns focus", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "More about Right to Information" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await button.getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Right to Information Act, 2005");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
});

test("focus rings are visible on links and buttons", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});
