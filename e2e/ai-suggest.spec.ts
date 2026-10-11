import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

async function toAuthorityStep(page: Page) {
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill("Ticket refund");
  await page.getByLabel("What information do you want?").fill("My train ticket refund for PNR 4512398760 has not come.");
}

test("shows a loader, then a Recommended tag with a reason, which selects the department", async ({ page }) => {
  await login(page, `sg-${Date.now()}@example.com`);
  await toAuthorityStep(page);
  // Reply with the real Railways id, read from the next step's list.
  await page.route("**/api/ai/suggest-authority", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    const id = await page.locator("label", { hasText: "Ministry of Railways" }).getAttribute("data-authority-id");
    await route.fulfill({ json: { authorityId: id, reason: "Train ticket refunds are handled by the Ministry of Railways." } });
  });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("ai-recommendation").getByRole("status")).toHaveText("Finding the best department…");
  const tag = page.getByTestId("ai-recommendation").getByRole("button", { name: "Ministry of Railways" });
  await expect(tag).toBeVisible();
  await expect(page.locator("label", { hasText: "Ministry of Railways" }).getByText("Recommended")).toBeVisible();
  await page.getByRole("button", { name: "More about why this department" }).click();
  await expect(page.getByText("Train ticket refunds are handled by the Ministry of Railways.")).toBeVisible();
  await tag.click();
  await expect(page.getByRole("radio", { name: /Ministry of Railways/ })).toBeChecked();
});

test("when AI is unavailable, keyword suggestions still appear straight away", async ({ page }) => {
  await login(page, `sg-off-${Date.now()}@example.com`); // AI routes answer "switched off"
  await toAuthorityStep(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("suggestions").getByRole("button", { name: /Railways/ })).toBeVisible({ timeout: 1000 });
  await expect(page.getByTestId("ai-recommendation")).toHaveCount(0);
});
