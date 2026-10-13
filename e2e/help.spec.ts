import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("the Help page is reachable from the navigation and footer and expands answers", async ({ page }, info) => {
  await page.goto("/stats");
  // On phones, Help is in the bottom tab bar rather than the one-row header.
  const nav = page.getByRole("navigation", { name: info.project.name === "mobile" ? "Quick navigation" : "Main" });
  await nav.getByRole("link", { name: "Help" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
  await page.getByText("First appeal", { exact: true }).click();
  await expect(page.getByText(/section 19\(1\)/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("disclaimer").getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
});

test("info buttons on the filing form open with the keyboard and explain the term", async ({ page }) => {
  await login(page, `help-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  const check = async (label: string, text: string) => {
    const button = page.getByRole("button", { name: `More about ${label}` });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: label })).toContainText(text);
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
  };
  await check("The 500-word guide", "can't be rejected for its length");
  // The fee options are on the Review and pay step.
  await page.getByLabel("Subject").fill("Ticket refund");
  await page.getByLabel("What information do you want?").fill("Refund status for PNR 1234567890.");
  await page.getByRole("group", { name: "Popular" }).getByRole("button", { name: "Railways" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await check("Below poverty line (BPL)", "rule 5");
  await check("Life or liberty", "48 hours");
});
