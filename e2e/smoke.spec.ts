import { test, expect } from "@playwright/test";
import authorities from "../data/authorities.json";

test("landing page shows the student-project disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("disclaimer")).toContainText("Not affiliated");
});

test("the daily cron route rejects calls without the secret", async ({ request }) => {
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
});

test("the public stats page lists every authority, as a table on desktop and cards on phones", async ({ page }, info) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "How fast ministries reply" })).toBeVisible();
  if (info.project.name === "desktop") {
    await expect(page.getByRole("row")).toHaveCount(authorities.length + 1); // header + every authority
  } else {
    await expect(page.getByTestId("stat-card")).toHaveCount(authorities.length);
  }
  // Colour is never the only signal: the legend says what the bar colours mean.
  await expect(page.getByTestId("stats-legend")).toContainText("30 days");
});
