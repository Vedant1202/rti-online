import { test, expect } from "@playwright/test";

test("a slow page with a skeleton shows it instantly, then the page", async ({ page }) => {
  // Delay the page's data (not the prefetch), as on a slow network.
  let prefetched = false;
  await page.route("**/stats**", async (route) => {
    if (route.request().headers()["next-router-prefetch"]) prefetched = true;
    else await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/");
  // Next prefetches a link's loading skeleton once the link is on screen (below the fold on phones).
  const link = page.getByRole("link", { name: /how fast each ministry answers/i });
  await link.scrollIntoViewIfNeeded();
  await expect.poll(() => prefetched).toBe(true);
  await link.click();
  await expect(page.getByTestId("page-skeleton")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How fast ministries reply" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("page-skeleton")).toBeHidden();
});

test("a slow page without a skeleton shows the top progress bar until it arrives", async ({ page }) => {
  await page.goto("/stats");
  await page.waitForLoadState("networkidle");
  await page.route("**/login**", async (route) => {
    if (!route.request().headers()["next-router-prefetch"]) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByTestId("nav-progress")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("nav-progress")).toBeHidden();
});

test("action buttons show a busy state while sending", async ({ page }) => {
  await page.goto("/login");
  await page.route("**/api/auth/otp/send", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.continue();
  });
  await page.getByLabel("Email address").fill(`busy-${Date.now()}@example.com`);
  const button = page.getByRole("button", { name: "Email me a code" });
  await button.click();
  await expect(page.getByRole("button", { name: "Sending…" })).toHaveAttribute("aria-busy", "true");
});
