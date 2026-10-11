import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

async function startCheckout(page: Page, subject: string) {
  await login(page, `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`);
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("What information do you want?").fill("Status of refund for PNR 1234567890.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Railways/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  await expect(page.getByRole("heading", { name: "Pay with card" })).toBeVisible();
}

test("a saved card fills the form in one click and pays; only brand and last 4 are sent", async ({ page }) => {
  await startCheckout(page, "Saved card");
  await expect(page.getByText(/mock|test|demo/i)).toHaveCount(0);
  await expect(page.getByText(/stripe/i)).toHaveCount(0);

  await page.getByRole("button", { name: /Visa ending in 4242/ }).click();
  await expect(page.getByLabel("Card number")).toHaveValue("4242 4242 4242 4242");
  await expect(page.getByLabel("Expiry (MM/YY)")).toHaveValue("12/30");
  await expect(page.getByLabel("Security code (CVC)")).toHaveValue("123");
  await expect(page.getByLabel("Name on card")).toHaveValue("Asha Sharma");
  await expect(page.getByRole("group", { name: "Card information" }).getByTestId("card-brand")).toHaveAttribute("data-brand", "visa");

  const sent = page.waitForRequest((r) => r.url().includes("/api/payments/checkout/") && r.method() === "POST");
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  const body = (await sent).postData() ?? "";
  expect(body).not.toContain("4242424242424242");
  expect(body).not.toContain("4242 4242");
  expect(body).not.toMatch(/cvc|123|12\/30/i);
  expect(JSON.parse(body)).toEqual({ brand: "visa", last4: "4242" });

  await expect(page.getByText("Your request is filed")).toBeVisible();
  await expect(page.getByTestId("reg-no")).toHaveText(/^MORLY\/R\/E\/\d{2}\/\d{5}$/);
});

test("typing a card shows its brand, and invalid details block payment with messages", async ({ page }) => {
  await startCheckout(page, "Invalid card");
  await page.getByLabel("Card number").fill("5555");
  await expect(page.getByRole("group", { name: "Card information" }).getByTestId("card-brand")).toHaveAttribute("data-brand", "mastercard");
  await page.getByLabel("Card number").fill("4242 4242 4242 4241");
  await page.getByLabel("Expiry (MM/YY)").fill("01/20");
  await page.getByLabel("Security code (CVC)").fill("12");
  await page.getByLabel("Name on card").fill("Asha");
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  await expect(page.getByText("Your card number isn't valid")).toBeVisible();
  await expect(page.getByText("Your card has expired.")).toBeVisible();
  await expect(page.getByLabel("Card number")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Card number")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Pay with card" })).toBeVisible(); // still here
});

test("the declined card shows a decline message and lets you try another card", async ({ page }) => {
  await startCheckout(page, "Declined card");
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByLabel("Expiry (MM/YY)").fill("11/29");
  await page.getByLabel("Security code (CVC)").fill("321");
  await page.getByLabel("Name on card").fill("Asha Sharma");
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your card was declined" })).toBeVisible();
  await page.getByRole("button", { name: /Mastercard ending in 4444/ }).click();
  await page.getByRole("button", { name: "Pay ₹10" }).click();
  await expect(page.getByText("Your request is filed")).toBeVisible();
});
