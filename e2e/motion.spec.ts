import { test, expect, type Page } from "@playwright/test";
import { as, fileViaUi } from "./helpers";

const animated = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => getComputedStyle(el).animationName !== "none")
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`),
  );

test("page sections rise in gently as the page loads", async ({ page }) => {
  await page.goto("/");
  const name = await page.locator("main section").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("rise");
});

test("with reduced motion, nothing animates on the home, filing and case pages", async ({ browser }, info) => {
  const page = await as(browser, `still-${Date.now()}@example.com`, info.project.name === "mobile" ? { width: 375, height: 812 } : undefined);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await animated(page), "home").toEqual([]);
  await page.goto("/requests/new");
  expect(await animated(page), "filing").toEqual([]);
  await fileViaUi(page, { authority: /Railways/, subject: "Still", body: "Refund status for PNR 1234567890." });
  expect(await animated(page), "case page").toEqual([]);
});
