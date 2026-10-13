import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { as, BASE_URL, officer } from "./helpers";

const vp = (name: string) => (name === "mobile" ? { width: 375, height: 812 } : undefined);

test("हिन्दी switches the interface to Hindi, sets lang=hi, and is remembered", async ({ page }) => {
  await page.goto("/");
  const switcher = page.getByRole("group", { name: "Language" });
  await switcher.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.locator("main h1")).toContainText("केंद्र सरकार");
  await expect(page.getByTestId("utility-bar")).toContainText("छात्र");
  await expect(page.getByTestId("disclaimer")).toContainText("छात्र परियोजना");
  await expect(page.getByRole("group", { name: "भाषा" }).getByRole("button", { name: "हिन्दी" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.locator("main h1")).toContainText("केंद्र सरकार");

  await page.getByRole("group", { name: "भाषा" }).getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("main h1")).toContainText("Ask the central government");
});

test("golden path 1 in Hindi: file, pay, get a number, see the timeline", async ({ browser }, info) => {
  const page = await as(browser, `hindi-${Date.now()}@example.com`, vp(info.project.name));
  await page.context().addCookies([{ name: "rti_lang", value: "hi", url: BASE_URL }]);
  await page.goto("/requests/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("आरटीआई आवेदन दर्ज करें");

  await page.locator("#subject").fill("पेंशन फ़ाइल की स्थिति");
  await page.locator("#body").fill("कृपया मेरी पेंशन फ़ाइल PPO/2019/4471 की वर्तमान स्थिति और देरी के कारण बताएं।");
  await page.getByTestId("suggestions").getByRole("button", { name: /Pension and Pensioners/ }).click();
  await page.getByRole("button", { name: "आगे बढ़ें" }).click();
  await expect(page.getByTestId("review-fee")).toHaveText("₹10");
  await page.getByRole("button", { name: "₹10 का भुगतान करें और दर्ज करें" }).click();

  await expect(page.getByRole("heading", { name: "कार्ड से भुगतान करें" })).toBeVisible();
  await page.getByRole("button", { name: /Visa.*4242/ }).click();
  await page.getByRole("button", { name: "₹10 का भुगतान करें" }).click();

  await expect(page.getByTestId("reg-no")).toHaveText(/^DOPPW\/R\/E\/\d{2}\/\d{5}$/);
  await expect(page.getByText("आपका आवेदन दर्ज हो गया है")).toBeVisible();
  await expect(page.getByTestId("timeline")).toContainText("दर्ज और भुगतान किया गया");
  await expect(page.getByRole("list", { name: "प्रगति" }).locator("[aria-current=step]")).toContainText("अधिकारी के पास");
});

test("officer pages stay in English even with Hindi chosen", async ({ browser }, info) => {
  const page = await as(browser, officer("DOPPW", "nodal"), vp(info.project.name));
  await page.context().addCookies([{ name: "rti_lang", value: "hi", url: BASE_URL }]);
  await page.goto("/officer/nodal");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" }).or(page.getByRole("link", { name: /Dashboard/ })).first()).toBeAttached();
});

test("in Hindi at 375px, pages fit the screen and the header stays one row", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  const page = await as(browser, `hindi-narrow-${Date.now()}@example.com`, { width: 375, height: 812 });
  await page.context().addCookies([{ name: "rti_lang", value: "hi", url: BASE_URL }]);
  for (const path of ["/", "/requests", "/requests/new", "/stats", "/help"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    expect((await page.getByTestId("header-row").boundingBox())!.height, `header height on ${path}`).toBeLessThanOrEqual(64);
  }
});

test("Hindi pages have no serious accessibility issues", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "desktop scan");
  const page = await as(browser, `hindi-axe-${Date.now()}@example.com`);
  await page.context().addCookies([{ name: "rti_lang", value: "hi", url: BASE_URL }]);
  for (const path of ["/", "/requests/new", "/help"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});
