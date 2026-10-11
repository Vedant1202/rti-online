import { test, expect } from "@playwright/test";
import { as, fileViaUi } from "./helpers";

test("#8: key pages have no horizontal scroll at 375px", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  const page = await as(browser, `narrow-${Date.now()}@example.com`, { width: 375, height: 812 });
  const { url } = await fileViaUi(page, { authority: /Railways/, subject: "Ticket refund", body: "Refund status for PNR 1234567890." });
  for (const path of ["/", "/stats", "/requests", "/requests/new", new URL(url).pathname]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});
