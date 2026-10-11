import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const ORIGINAL = "whats happening with my pension PPO/2019/4471 since july??";
const FORMAL = "Under section 6(1) of the RTI Act, I request the current status of my pension case PPO/2019/4471, pending since July.";

test("rewrite shows a loader, then a preview that only replaces the text when chosen, with undo", async ({ page }) => {
  await login(page, `rw-${Date.now()}@example.com`);
  await page.route("**/api/ai/rewrite", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({ json: { rewritten: FORMAL } });
  });
  await page.goto("/requests/new");
  const body = page.getByLabel("What information do you want?");
  await body.fill(ORIGINAL);
  await page.getByRole("button", { name: "Rewrite formally" }).click();

  await expect(page.getByRole("button", { name: "Rewriting…" })).toHaveAttribute("aria-busy", "true");
  await expect(body).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("rewrite-preview")).toHaveText(FORMAL);
  await expect(body).toHaveValue(ORIGINAL); // not replaced yet
  await expect(page.getByTestId("announcer")).toContainText("Formal rewrite ready");

  await page.getByRole("button", { name: "Keep mine" }).click();
  await expect(body).toHaveValue(ORIGINAL);

  await page.getByRole("button", { name: "Rewrite formally" }).click();
  await page.getByRole("button", { name: "Use rewrite" }).click();
  await expect(body).toHaveValue(FORMAL);
  await page.getByRole("button", { name: "Undo rewrite" }).click();
  await expect(body).toHaveValue(ORIGINAL);
});

test("an AI error is shown and the text is left alone", async ({ page }) => {
  await login(page, `rw-err-${Date.now()}@example.com`);
  await page.route("**/api/ai/rewrite", (route) =>
    route.fulfill({ status: 429, json: { error: "You've used the AI features 20 times in the last hour. Try again in 12 minutes.", code: "rate_limited" } }),
  );
  await page.goto("/requests/new");
  await page.getByLabel("What information do you want?").fill(ORIGINAL);
  await page.getByRole("button", { name: "Rewrite formally" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again in 12 minutes" })).toBeVisible();
  await expect(page.getByLabel("What information do you want?")).toHaveValue(ORIGINAL);
});
