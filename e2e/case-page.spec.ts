import { test, expect } from "@playwright/test";
import { as, fileViaUi, startCheckoutViaUi } from "./helpers";

const vp = (name: string) => (name === "mobile" ? { width: 375, height: 812 } : undefined);

test("the case page shows where the request is, and how many days are left", async ({ browser }, info) => {
  const page = await as(browser, `stepper-${Date.now()}@example.com`, vp(info.project.name));
  await fileViaUi(page, { authority: /Railways/, subject: "Lift tender", body: "Copies of the lift tender for platform 3." });
  const stepper = page.getByRole("list", { name: "Progress" });
  await expect(stepper.getByRole("listitem")).toHaveCount(5);
  const current = stepper.locator("[aria-current=step]");
  await expect(current).toContainText("With officer");
  await expect(current).toContainText("Step 2 of 5");
  await expect(stepper.getByRole("listitem").first()).toContainText("done");
  const days = page.getByRole("progressbar", { name: "Days left on the reply clock" });
  await expect(days).toHaveAttribute("aria-valuenow", "30");
  await expect(page.getByTestId("next-action")).toHaveCount(0);
});

test("an unpaid request shows the payment as the next step, above the tab bar on phones", async ({ browser }, info) => {
  const page = await as(browser, `sticky-${Date.now()}@example.com`, vp(info.project.name));
  const subject = `Unpaid ${Date.now()}`;
  await startCheckoutViaUi(page, { authority: /Railways/, subject, body: "Refund status for PNR 1234567890." });
  await page.goto("/requests");
  await page.getByRole("link", { name: new RegExp(subject) }).click();

  const bar = page.getByTestId("next-action");
  await expect(bar.getByRole("link", { name: "Pay ₹10" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pay ₹10" })).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Progress" }).locator("[aria-current=step]")).toContainText("Waiting for you");

  if (info.project.name === "mobile") {
    const tabs = (await page.getByRole("navigation", { name: "Quick navigation" }).boundingBox())!;
    const box = (await bar.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(tabs.y + 1);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = (await page.getByTestId("disclaimer").boundingBox())!;
    expect(footer.y + footer.height, "footer hidden behind the action bar").toBeLessThanOrEqual((await bar.boundingBox())!.y + 1);
  }
});
