import { test, expect } from "@playwright/test";
import { as, fileViaUi, officer } from "./helpers";

const vp = (name: string) => (name === "mobile" ? { width: 375, height: 812 } : undefined);

test("signed-out visitors get the two main actions and how it works", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: "File a request" })).toHaveAttribute("href", "/requests/new");
  await expect(main.getByRole("link", { name: "Track my requests" })).toHaveAttribute("href", "/requests");
  const steps = main.getByRole("list", { name: "How it works" }).getByRole("listitem");
  await expect(steps).toHaveCount(4);
  await expect(steps.first()).toContainText("Write");
});

test("the visitor home leads with a gradient hero, a decorative preview and why it's better", async ({ page }, info) => {
  await page.goto("/");
  const hero = page.getByTestId("hero");
  expect(await hero.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/gradient/);
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  // The preview card is decoration only: hidden from screen readers, shown on wider screens.
  const preview = page.getByTestId("hero-preview");
  await expect(preview).toHaveAttribute("aria-hidden", "true");
  if (info.project.name === "desktop") await expect(preview).toBeVisible();
  const why = page.getByRole("region", { name: "Why it's better" });
  await expect(why.getByRole("listitem")).toHaveCount(4);
});

test("a citizen's home shows what needs doing; an additional fee is 2 clicks from the card form", async ({ browser }, info) => {
  const viewport = vp(info.project.name);
  const citizen = await as(browser, `home-${Date.now()}@example.com`, viewport);
  const subject = `Coach refund ${Date.now()}`;
  await fileViaUi(citizen, { authority: /Railways/, subject, body: "Refund status and file notings for PNR 4455667788." });

  // Filed and with the officers: nothing to do yet.
  await citizen.goto("/");
  await expect(citizen.getByTestId("no-actions")).toContainText("Nothing needs your attention");
  await expect(citizen.getByTestId("in-progress")).toContainText(subject);
  // The welcome band counts what needs doing and what's in progress.
  await expect(citizen.getByTestId("count-actions")).toHaveText("0");
  await expect(citizen.getByTestId("count-progress")).toHaveText("1");

  const nodal = await as(browser, officer("MORLY", "nodal"), viewport);
  await nodal.goto("/officer/nodal");
  await nodal.getByRole("link", { name: new RegExp(subject) }).click();
  await nodal.getByRole("checkbox", { name: /Section A/ }).check();
  await nodal.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(nodal.getByTestId("timeline")).toContainText(/Forwarded/);

  const cpio = await as(browser, officer("MORLY", "cpio1"), viewport);
  await cpio.goto("/officer/cpio");
  await cpio.getByRole("link", { name: new RegExp(subject) }).click();
  await cpio.getByRole("tab", { name: "Ask for fee" }).click();
  await cpio.getByLabel("Qty").fill("12");
  await cpio.getByRole("button", { name: "Send fee request" }).click();
  await expect(cpio.getByText("Waiting for the additional fee")).toBeVisible();

  await citizen.goto("/");
  await expect(citizen.getByTestId("count-actions")).toHaveText("1");
  const actions = citizen.getByRole("region", { name: "Needs your action" });
  await expect(actions).toContainText(subject);
  await actions.getByRole("link", { name: "Pay ₹24" }).click(); // 1
  await citizen.getByRole("button", { name: "Pay ₹24" }).click(); // 2
  await citizen.waitForURL(/\/pay\//);
  await expect(citizen.getByRole("button", { name: /Visa ending in 4242/ })).toBeVisible();
});

test("officers get a link to their queue on the home page", async ({ browser }, info) => {
  const page = await as(browser, officer("DOPAT", "cpio1"), vp(info.project.name));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open your queue" })).toHaveAttribute("href", "/officer/cpio");
});
