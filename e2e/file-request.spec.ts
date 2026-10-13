import { test, expect } from "@playwright/test";
import { as, login } from "./helpers";

test("from the home page, filing and paying with a saved card takes 6 clicks", async ({ browser }, info) => {
  const page = await as(browser, `six-${Date.now()}@example.com`, info.project.name === "mobile" ? { width: 375, height: 812 } : undefined);
  await page.goto("/");
  await page.locator("main").getByRole("link", { name: "File a request" }).click(); // 1
  await page.getByLabel("Subject").fill("Lift tender");
  await page.getByLabel("What information do you want?").fill("Copies of the tender documents for the lift at platform 3, Pune station.");
  await page.getByRole("group", { name: "Popular" }).getByRole("button", { name: "Railways" }).click(); // 2
  await page.getByRole("button", { name: "Continue" }).click(); // 3
  await page.getByRole("button", { name: "Pay ₹10 and file" }).click(); // 4
  await page.getByRole("button", { name: /Visa ending in 4242/ }).click(); // 5
  await page.getByRole("button", { name: "Pay ₹10" }).click(); // 6
  await expect(page.getByTestId("reg-no")).toHaveText(/^MORLY\/R\/E\/\d{2}\/\d{5}$/);
});

test("citizen files a Hindi request, sees the state warning, pays, and gets a number", async ({ page }) => {
  await login(page, `asha-${Date.now()}@example.com`);
  await page.goto("/requests/new");

  await page.getByLabel("Subject").fill("पेंशन फ़ाइल की स्थिति");
  const body =
    "कृपया मेरी पेंशन फ़ाइल PPO/2019/4471 की वर्तमान स्थिति बताएं। ".repeat(70) + "नगर निगम से कोई संबंध नहीं।";
  await page.getByLabel("What information do you want?").fill(body);
  await expect(page.getByTestId("word-count")).toContainText("636 / 500");
  await expect(page.getByTestId("word-count")).toContainText("can't be rejected");

  // Same step: suggestion from Hindi keywords, plus the state-body warning (dismissable by continuing).
  await expect(page.getByTestId("state-warning")).toContainText("नगर निगम");
  await page.getByTestId("suggestions").getByRole("button", { name: /Pension and Pensioners/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Review and pay: the warning is shown again before any money changes hands.
  await expect(page.getByTestId("state-warning")).toBeVisible();
  await expect(page.getByTestId("review-fee")).toHaveText("₹10");
  await page.getByRole("button", { name: "Pay ₹10 and file" }).click();

  await page.getByRole("button", { name: /Visa ending in 4242/ }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();

  await expect(page.getByText("Your request is filed")).toBeVisible();
  await expect(page.getByTestId("reg-no")).toHaveText(/^DOPPW\/R\/E\/\d{2}\/\d{5}$/);
  await expect(page.getByTestId("timeline")).toContainText("Filed and paid");
  await expect(page.getByText("30 days left", { exact: true })).toBeVisible();
});
