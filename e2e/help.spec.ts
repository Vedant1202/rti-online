import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("the Help page is reachable from the header and footer and expands answers", async ({ page }) => {
  await page.goto("/stats");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Help" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
  await page.getByText("First appeal", { exact: true }).click();
  await expect(page.getByText(/section 19\(1\)/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("disclaimer").getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
});

test("info buttons on the filing form open with the keyboard and explain the term", async ({ page }) => {
  await login(page, `help-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  for (const [label, text] of [
    ["The 500-word guide", "can't be rejected for its length"],
    ["Below poverty line (BPL)", "rule 5"],
    ["Life or liberty", "48 hours"],
  ] as const) {
    const button = page.getByRole("button", { name: `More about ${label}` });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: label })).toContainText(text);
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
  }
});
