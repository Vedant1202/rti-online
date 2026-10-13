import { test, expect } from "@playwright/test";
import { as, officer, startCheckoutViaUi } from "./helpers";

const PHONE = { width: 375, height: 812 };
const tabBar = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Quick navigation" });

test.describe("on a phone", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "mobile only"));

  test("the tab bar has Home, File, My requests and Help, each a comfortable tap target", async ({ page }) => {
    await page.goto("/");
    const bar = tabBar(page);
    await expect(bar).toBeVisible();
    for (const name of ["Home", "File", "My requests", "Help"]) {
      const link = bar.getByRole("link", { name });
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(bar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await bar.getByRole("link", { name: "Help" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
    await expect(tabBar(page).getByRole("link", { name: "Help" })).toHaveAttribute("aria-current", "page");
  });

  test("nothing hides behind the tab bar at the end of a page", async ({ page }) => {
    for (const path of ["/", "/help", "/stats"]) {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const footer = (await page.getByTestId("disclaimer").boundingBox())!;
      const bar = (await tabBar(page).boundingBox())!;
      expect(footer.y + footer.height, `footer hidden on ${path}`).toBeLessThanOrEqual(bar.y + 1);
    }
  });

  test("the tab bar stays out of the card checkout", async ({ browser }) => {
    const page = await as(browser, `tabbar-${Date.now()}@example.com`, PHONE);
    await page.goto("/");
    await expect(tabBar(page)).toBeVisible();
    await startCheckoutViaUi(page, { authority: /Railways/, subject: "Refund", body: "Refund status for PNR 1234567890." });
    await expect(tabBar(page)).toHaveCount(0);
  });

  test("officers don't get the citizen tab bar", async ({ browser }) => {
    const page = await as(browser, officer("DOPAT", "nodal"), PHONE);
    await page.goto("/officer/nodal");
    await expect(tabBar(page)).toHaveCount(0);
  });
});

test("there is no tab bar on desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
  await page.goto("/");
  await expect(tabBar(page)).toBeHidden();
});
