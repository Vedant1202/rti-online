import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { as, officer } from "./helpers";

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${label}: ${v.id} (${v.impact}) ${v.help} → ${v.nodes.map((n) => `${n.target.join(" ")} ${n.any.map((a) => a.message).join(";")}`).slice(0, 3).join(" | ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test(`public pages have no serious accessibility issues (${theme})`, async ({ page, context, baseURL }) => {
      test.skip(test.info().project.name === "mobile", "scanned once, at desktop width");
      await context.addCookies([{ name: "rti_theme", value: theme, url: baseURL! }]);
      for (const path of ["/", "/login", "/help", "/stats"]) {
        await page.goto(path);
        await scan(page, `${theme} ${path}`);
      }
    });

    test(`signed-in pages have no serious accessibility issues (${theme})`, async ({ browser, baseURL }) => {
      test.skip(test.info().project.name === "mobile", "scanned once, at desktop width");
      const page = await as(browser, `a11y-${theme}-${Date.now()}@example.com`);
      await page.context().addCookies([{ name: "rti_theme", value: theme, url: baseURL! }]);
      await page.goto("/requests/new");
      await scan(page, `${theme} wizard step 1`);
      await page.getByLabel("Subject").fill("Ticket refund");
      await page.getByLabel("What information do you want?").fill("Refund status for PNR 1234567890.");
      await page.getByRole("button", { name: "Continue" }).click();
      await scan(page, `${theme} wizard step 2`);
      await page.getByRole("radio", { name: /Railways/ }).check();
      await page.getByRole("button", { name: "Continue" }).click();
      await scan(page, `${theme} wizard step 3`);
      await page.getByRole("button", { name: "Continue to payment" }).click();
      await scan(page, `${theme} pay page`);
      await page.getByRole("button", { name: "Pay ₹10" }).click();
      await expect(page.getByRole("heading", { name: "Pay with card" })).toBeVisible();
      await scan(page, `${theme} checkout`);
      await page.getByRole("button", { name: /Visa ending in 4242/ }).click();
      await page.getByRole("button", { name: "Pay ₹10" }).click();
      await expect(page.getByTestId("reg-no")).toBeVisible();
      await scan(page, `${theme} case page`);
      await page.goto("/requests");
      await scan(page, `${theme} my requests`);

      const nodal = await as(browser, officer("MORLY", "nodal"));
      await nodal.context().addCookies([{ name: "rti_theme", value: theme, url: baseURL! }]);
      await nodal.goto("/officer/nodal");
      await scan(nodal, `${theme} nodal inbox`);
    });
  });
}

test("keyboard only: file → pay → see the timeline", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "desktop keyboard path");
  const { login } = await import("./helpers");
  await login(page, `kbd-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  const tabTo = async (name: RegExp | string, role: "button" | "radio" | "textbox" | "link" = "button") => {
    const target = page.getByRole(role, { name });
    for (let i = 0; i < 60; i++) {
      if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`Couldn't reach ${name} with Tab`);
  };
  await tabTo("Subject", "textbox");
  await page.keyboard.type("Keyboard request");
  await tabTo("What information do you want?", "textbox");
  await page.keyboard.type("Refund status for PNR 1234567890.");
  await tabTo("Continue");
  await page.keyboard.press("Enter");
  // Tab enters the radio group once; arrow keys move between options (native behaviour).
  for (let i = 0; i < 60 && !(await page.evaluate(() => (document.activeElement as HTMLInputElement)?.type === "radio")); i++) {
    await page.keyboard.press("Tab");
  }
  const railways = page.getByRole("radio", { name: /Ministry of Railways/ });
  for (let i = 0; i < 6 && !(await railways.isChecked()); i++) await page.keyboard.press("ArrowDown");
  await expect(railways).toBeChecked();
  await tabTo("Continue");
  await page.keyboard.press("Enter");
  await tabTo("Continue to payment");
  await page.keyboard.press("Enter");
  await tabTo("Pay ₹10");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Pay with card" })).toBeVisible();
  await tabTo(/Visa ending in 4242/);
  await page.keyboard.press("Enter");
  await tabTo("Pay ₹10");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timeline")).toContainText("Filed and paid");
});
