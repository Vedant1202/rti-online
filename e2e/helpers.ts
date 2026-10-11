import { expect, type Page } from "@playwright/test";

/** Signs in through the real OTP flow, reading the code from the demo-mode banner. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  const code = (await page.getByTestId("dev-code").locator("strong").textContent())!.trim();
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export const officer = (code: string, tag: string) =>
  `team+${code.toLowerCase()}.${tag}@example.com`;

export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}($|\\?)`));
}

import type { Browser } from "@playwright/test";

type StorageState = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;
const sessions = new Map<string, StorageState>();

/**
 * A separate signed-in browser context per role, so cookies don't mix.
 * Each email signs in once per run (the app allows 3 codes per 15 minutes per email).
 */
export async function as(browser: Browser, email: string, viewport?: { width: number; height: number }) {
  const saved = sessions.get(email);
  const context = await browser.newContext({ ...(viewport ? { viewport } : {}), ...(saved ? { storageState: saved } : {}) });
  const page = await context.newPage();
  if (!saved) {
    await login(page, email);
    sessions.set(email, await context.storageState());
  }
  return page;
}

/** Files and pays a request through the UI; returns the case page URL and registration number. */
export async function fileViaUi(page: Page, opts: { authority: RegExp; subject: string; body: string }) {
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill(opts.subject);
  await page.getByLabel("What information do you want?").fill(opts.body);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: opts.authority }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  await page.getByRole("button", { name: /Visa ending in 4242/ }).click();
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  const regNo = (await page.getByTestId("reg-no").textContent())!.trim();
  return { url: page.url().split("?")[0], regNo };
}

/** Moves the server clock forward (test-only route). Always reset in afterEach. */
export async function moveClock(page: Page, days: number) {
  const res = await page.request.post("/api/test/clock", { data: { days } });
  if (!res.ok()) throw new Error(`clock route returned ${res.status()}`);
}
