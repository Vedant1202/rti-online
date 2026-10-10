import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("citizen files a Hindi request, pays, and sees the registration number", async ({ page }) => {
  await login(page, `asha-${Date.now()}@example.com`);
  await page.goto("/requests/new");

  await page.getByLabel("Search authorities").fill("pension");
  await page.getByRole("radio", { name: /Pension and Pensioners/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Subject").fill("पेंशन फ़ाइल की स्थिति");
  const body = "कृपया मेरी पेंशन फ़ाइल PPO/2019/4471 की वर्तमान स्थिति बताएं। ".repeat(70); // 630 words
  await page.getByLabel("What information do you want?").fill(body);
  await expect(page.getByTestId("word-count")).toContainText("630 / 500");
  await expect(page.getByTestId("word-count")).toContainText("can't be rejected");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("₹10")).toBeVisible();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();

  await expect(page.getByText("MockPay · test gateway")).toBeVisible();
  await page.getByRole("button", { name: "Simulate successful payment" }).click();

  await expect(page.getByRole("status")).toContainText("Your request is filed");
  await expect(page.getByTestId("reg-no")).toHaveText(/^DOPPW\/R\/E\/\d{2}\/\d{5}$/);
  await expect(page.getByTestId("timeline")).toContainText("Filed and paid");
  await expect(page.getByText("30 days left", { exact: true })).toBeVisible();
  await expect(page.getByText("पेंशन फ़ाइल की स्थिति").first()).toBeVisible();
});

test("a failed payment leaves the request payable", async ({ page }) => {
  await login(page, `ravi-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  await page.getByRole("radio", { name: /Railways/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Subject").fill("Ticket refund");
  await page.getByLabel("What information do you want?").fill("Status of refund for PNR 1234567890.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  await page.getByRole("button", { name: "Simulate failed payment" }).click();
  await expect(page.getByText("No money was taken")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay ₹10" })).toBeEnabled();
});
