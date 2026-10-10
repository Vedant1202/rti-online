import { test, expect } from "@playwright/test";
import { as } from "./helpers";

test("a draft saves automatically and restores in another browser", async ({ browser }) => {
  const email = `draft-${Date.now()}@example.com`;
  const first = await as(browser, email);
  await first.goto("/requests/new");
  await first.getByLabel("Subject").fill("Hostel allotment list");
  await first.getByLabel("What information do you want?").fill("Copy of the 2026 hostel allotment list.");
  await expect(first.getByTestId("draft-status")).toContainText("Draft saved", { timeout: 10_000 });

  const second = await as(browser, email); // fresh context, same account
  await second.goto("/requests/new");
  await expect(second.getByTestId("draft-status")).toContainText("Restored");
  await expect(second.getByLabel("Subject")).toHaveValue("Hostel allotment list");
});

test("a template's placeholders must be filled before continuing", async ({ browser }) => {
  const page = await as(browser, `tpl-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  await page.getByRole("button", { name: "Pension or gratuity status" }).click();
  await expect(page.getByTestId("placeholders")).toContainText("[PPO number]");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  const body = page.getByLabel("What information do you want?");
  const text = (await body.inputValue())
    .replace("[PPO number]", "4471")
    .replace("[retirement date]", "30 June 2026")
    .replace("[date]", "1 July 2026");
  await body.fill(text);
  await expect(page.getByTestId("placeholders")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});
