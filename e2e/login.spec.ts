import { test, expect } from "@playwright/test";
import { expectPath, login, officer } from "./helpers";

test("a new citizen signs in with an emailed code", async ({ page }) => {
  await login(page, `citizen-${Date.now()}@example.com`);
  await expectPath(page, "/requests");
});

test("a nodal officer lands on the nodal dashboard", async ({ page }) => {
  await login(page, officer("DOPAT", "nodal"));
  await expectPath(page, "/officer/nodal");
});

test("sign-in has a brand panel: three reasons on desktop, a compact header on phones", async ({ page }, info) => {
  await page.goto("/login");
  const brand = page.getByTestId("signin-brand");
  await expect(brand).toBeVisible();
  expect(await brand.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/gradient/);
  const reasons = brand.locator("li"); // hidden (display:none) on phones, so not by role
  await expect(reasons).toHaveCount(3);
  if (info.project.name === "desktop") await expect(reasons.first()).toBeVisible();
  else await expect(reasons.first()).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});
