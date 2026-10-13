import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/** The Railways authority id, read from its Popular chip. */
async function railwaysId(page: Page) {
  return page.getByRole("group", { name: "Popular" }).getByRole("button", { name: "Railways" }).getAttribute("data-authority-id");
}

async function writeRequest(page: Page, body = "My train ticket refund for PNR 4512398760 has not come.") {
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill("Ticket refund");
  await page.getByLabel("What information do you want?").fill(body);
}

test("shows a loader, then a Recommended tag with a reason, which selects the department", async ({ page }) => {
  await login(page, `sg-${Date.now()}@example.com`);
  // Reply with the real Railways id, read from the page's data.
  await page.route("**/api/ai/suggest-authority", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    const id = await railwaysId(page);
    await route.fulfill({ json: { authorityId: id, reason: "Train ticket refunds are handled by the Ministry of Railways." } });
  });
  await writeRequest(page);

  // The recommendation appears on the same step, shortly after typing stops.
  await expect(page.getByTestId("ai-recommendation").getByRole("status")).toHaveText("Finding the best department…");
  const tag = page.getByTestId("ai-recommendation").getByRole("button", { name: "Ministry of Railways" });
  await expect(tag).toBeVisible();
  await page.getByRole("button", { name: "More about why this department" }).click();
  await expect(page.getByText("Train ticket refunds are handled by the Ministry of Railways.")).toBeVisible();
  await tag.click();
  await expect(tag).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("selected-authority")).toContainText("Ministry of Railways");
  await expect(page.getByTestId("selected-authority")).toContainText("Recommended");
  await page.getByRole("button", { name: /Browse all/ }).click();
  await expect(page.getByRole("radio", { name: /Ministry of Railways/ })).toBeChecked();
  await expect(page.locator("label", { hasText: "Ministry of Railways" }).getByText("Recommended")).toBeVisible();
});

test("when AI is unavailable, keyword suggestions still appear straight away", async ({ page }) => {
  await login(page, `sg-off-${Date.now()}@example.com`); // AI routes answer "switched off"
  await writeRequest(page);
  await expect(page.getByTestId("suggestions").getByRole("button", { name: /Railways/ })).toBeVisible({ timeout: 1000 });
  await expect(page.getByTestId("ai-recommendation")).toHaveCount(0);
});

test("asks the AI only once the text has 8 words and typing has stopped, and once per text", async ({ page }) => {
  await login(page, `sg-count-${Date.now()}@example.com`);
  let calls = 0;
  await page.route("**/api/ai/suggest-authority", async (route) => {
    calls++;
    await route.fulfill({ json: { authorityId: null, reason: null } });
  });
  await writeRequest(page, "Train refund please"); // 3 words
  await page.waitForTimeout(2500);
  expect(calls).toBe(0);

  const body = page.getByLabel("What information do you want?");
  await body.pressSequentially(" for my ticket on PNR 4512398760 last week", { delay: 50 });
  await expect.poll(() => calls, { timeout: 5000 }).toBe(1);
  await page.waitForTimeout(2500);
  expect(calls).toBe(1); // nothing new to ask about
});
