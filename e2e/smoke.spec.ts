import { test, expect } from "@playwright/test";

test("landing page shows the student-project disclaimer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("disclaimer")).toContainText("Not affiliated");
});
