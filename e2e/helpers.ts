import { expect, type Page } from "@playwright/test";

/** Tests never call the real Gemini: AI routes answer "switched off" unless a test stubs them. */
export async function stubAiOff(page: Page) {
  await page.route("**/api/ai/**", (route) =>
    route.fulfill({ status: 503, json: { error: "AI features are switched off on this site.", code: "disabled" } }),
  );
}

/** Signs in through the real OTP flow, reading the code from the demo-mode banner. */
export async function login(page: Page, email: string) {
  await stubAiOff(page);
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
  await stubAiOff(page);
  if (!saved) {
    await login(page, email);
    sessions.set(email, await context.storageState());
  }
  return page;
}

type FileOpts = { authority: RegExp; subject: string; body: string };

/** Picks an authority from the full list ("Browse all") in the filing form. */
export async function chooseAuthority(page: Page, name: RegExp) {
  const browse = page.getByRole("button", { name: /Browse all/ });
  if ((await browse.getAttribute("aria-expanded")) !== "true") await browse.click();
  await page.getByRole("radio", { name }).check();
}

/** Fills in the filing form and stops on the card checkout page. */
export async function startCheckoutViaUi(page: Page, opts: FileOpts) {
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill(opts.subject);
  await page.getByLabel("What information do you want?").fill(opts.body);
  await page.getByRole("button", { name: "Continue" }).click();
  await chooseAuthority(page, opts.authority);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  await page.waitForURL(/\/pay\//);
}

/** Files and pays a request through the UI; returns the case page URL and registration number. */
export async function fileViaUi(page: Page, opts: FileOpts) {
  await startCheckoutViaUi(page, opts);
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
