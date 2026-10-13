/**
 * Before/after screenshots for docs/redesign. Run by hand against a local production server with
 * demo data (DEMO_SHOW_OTP=true):
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo.ts   # once, with the server stopped
 *   npm run start -- -p 3100
 *   npx tsx scripts/capture-redesign.ts
 *
 * The real portal is only visited on public pages: nothing is submitted and no box is ticked.
 */
import { mkdir } from "node:fs/promises";
import { chromium, type Browser, type Page } from "@playwright/test";

const OURS = process.env.CAPTURE_BASE_URL ?? "http://localhost:3100";
const REAL = "https://rtionline.gov.in";
const OUT = "docs/redesign";
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 375, height: 812 };
const DEMO_EMAIL = process.env.CAPTURE_EMAIL ?? "rti.archita+citizen.asha@gmail.com";

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1600); // let entrance animations and the confetti finish
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 80, fullPage });
  console.log("saved", name);
}

type Session = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;

async function open(browser: Browser, viewport: typeof DESKTOP, opts: { phone?: boolean; lang?: "hi"; session?: Session } = {}) {
  const context = await browser.newContext({
    viewport,
    colorScheme: "light",
    // A phone honours (or, on the real portal, lacks) the viewport meta tag.
    ...(opts.phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    // Reuse one sign-in: the app allows 3 codes per 15 minutes per email.
    ...(opts.session ? { storageState: opts.session } : {}),
  });
  if (opts.lang) await context.addCookies([{ name: "rti_lang", value: opts.lang, url: OURS }]);
  return context.newPage();
}

async function signIn(page: Page) {
  await page.goto(`${OURS}/login`);
  await page.getByLabel(/Email address|ईमेल पता/).fill(DEMO_EMAIL);
  await page.getByRole("button", { name: /Email me a code|मुझे कोड ईमेल करें/ }).click();
  const code = (await page.getByTestId("dev-code").locator("strong").textContent())!.trim();
  await page.getByLabel(/6-digit code|6 अंकों का कोड/).fill(code);
  await page.getByRole("button", { name: /^(Sign in|साइन इन करें)$/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Before: rtionline.gov.in (unchanged since October 2026; set CAPTURE_BEFORE=1 to retake)
  let page = await open(browser, DESKTOP);
  if (process.env.CAPTURE_BEFORE) {
  await page.goto(REAL);
  await shot(page, "before-home-desktop");
  await page.goto(`${REAL}/guidelines.php?request`);
  await shot(page, "before-filing-rules");
  await page.goto(`${REAL}/request/status.php`);
  await shot(page, "before-status");
  await page.goto(`${REAL}/request/allpa.php`);
  await shot(page, "before-authorities");
  page = await open(browser, PHONE, { phone: true });
  await page.goto(REAL);
  await shot(page, "before-home-phone");
  }

  // After: this rebuild, signed out
  page = await open(browser, DESKTOP);
  await page.goto(OURS);
  await shot(page, "after-home-desktop");
  page = await open(browser, PHONE, { phone: true });
  await page.goto(OURS);
  await shot(page, "after-home-phone");

  // After: signed in as the demo citizen (one sign-in, reused below)
  page = await open(browser, DESKTOP);
  await signIn(page);
  const session = await page.context().storageState();
  await page.goto(OURS);
  await shot(page, "after-citizen-home-desktop");
  const appealHref = await page.getByRole("link", { name: "File first appeal" }).first().getAttribute("href");
  const overdueId = appealHref!.split("/").pop()!;

  await page.goto(`${OURS}/requests/new`);
  await page.getByLabel("Subject").fill("Lift tender at Pune station");
  await page.getByLabel("What information do you want?").fill("Copies of the tender documents and the work order for the lift at platform 3, Pune station.");
  await page.getByRole("group", { name: "Popular" }).getByRole("button", { name: "Railways" }).click();
  await shot(page, "after-filing-desktop", true);

  await page.goto(`${OURS}/requests/${overdueId}`);
  await shot(page, "after-case-desktop");
  await page.goto(`${OURS}${appealHref}`);
  await shot(page, "after-appeal-desktop");

  page = await open(browser, PHONE, { phone: true, session });
  await page.goto(OURS);
  await shot(page, "after-citizen-home-phone");
  await page.goto(`${OURS}/requests/${overdueId}`);
  await shot(page, "after-case-phone");

  page = await open(browser, PHONE, { phone: true, lang: "hi", session });
  await page.goto(OURS);
  await shot(page, "after-hindi-phone");

  await browser.close();
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
