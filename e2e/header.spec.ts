import { test, expect } from "@playwright/test";
import { as } from "./helpers";

test("the utility bar says the site is unofficial and holds the text-size and theme controls", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByTestId("utility-bar");
  await expect(bar).toContainText(/Student rebuild/);
  await expect(bar).toContainText(/unofficial|not an official website/);
  await expect(bar.getByRole("group", { name: "Text size" })).toBeVisible();
  await expect(bar.getByTestId("theme-toggle")).toBeVisible();
});

test("no emblem and no official branding in the header", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header).not.toContainText("Government of India");
  await expect(header).not.toContainText("DoPT");
  await expect(page.locator("img[alt*='mblem' i]")).toHaveCount(0);
});

test("on a phone the header is one row, 64px or less", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  await page.goto("/");
  const row = page.getByTestId("header-row");
  const box = (await row.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(64);
  await expect(row.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("signed-in citizens see their links in the header on desktop", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
  const page = await as(browser, `header-${Date.now()}@example.com`);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "File a request" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "My requests" })).toBeVisible();
  await page.goto("/help");
  await expect(nav.getByRole("link", { name: "Help" })).toHaveAttribute("aria-current", "page");
});

test("the header row stays on screen while you scroll", async ({ page }) => {
  await page.goto("/help");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);
  const box = (await page.getByTestId("header-row").boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeLessThan(8);
});

test("the footer has the brand, page links and the student-project notice", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  const links = footer.getByRole("navigation", { name: "Footer" });
  for (const name of ["Home", "File a request", "Reply times", "Help"]) {
    await expect(links.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(footer.getByTestId("disclaimer")).toContainText("Not affiliated");
});
