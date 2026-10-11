import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("citizen files a Hindi request, sees the state warning, pays, and gets a number", async ({ page }) => {
  await login(page, `asha-${Date.now()}@example.com`);
  await page.goto("/requests/new");

  await page.getByLabel("Subject").fill("पेंशन फ़ाइल की स्थिति");
  const body =
    "कृपया मेरी पेंशन फ़ाइल PPO/2019/4471 की वर्तमान स्थिति बताएं। ".repeat(70) + "नगर निगम से कोई संबंध नहीं।";
  await page.getByLabel("What information do you want?").fill(body);
  await expect(page.getByTestId("word-count")).toContainText("636 / 500");
  await expect(page.getByTestId("word-count")).toContainText("can't be rejected");
  await page.getByRole("button", { name: "Continue" }).click();

  // Authority step: suggestion from Hindi keywords, plus the state-body warning (dismissable by continuing).
  await expect(page.getByTestId("state-warning")).toContainText("नगर निगम");
  await page.getByTestId("suggestions").getByRole("button", { name: /Pension and Pensioners/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("state-warning")).toBeVisible();
  await expect(page.getByText("₹10")).toBeVisible();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();

  await page.getByRole("button", { name: /Visa ending in 4242/ }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();

  await expect(page.getByText("Your request is filed")).toBeVisible();
  await expect(page.getByTestId("reg-no")).toHaveText(/^DOPPW\/R\/E\/\d{2}\/\d{5}$/);
  await expect(page.getByTestId("timeline")).toContainText("Filed and paid");
  await expect(page.getByText("30 days left", { exact: true })).toBeVisible();
});
