import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";
import authorities from "../data/authorities.json";

async function toPicker(page: Page, body = "Please give me the records I asked for.") {
  await login(page, `picker-${Date.now()}@example.com`);
  await page.goto("/requests/new");
  await page.getByLabel("Subject").fill("Records");
  await page.getByLabel("What information do you want?").fill(body);
}

test("a Popular chip picks its authority in one click", async ({ page }) => {
  await toPicker(page);
  const popular = page.getByRole("group", { name: "Popular" });
  await expect(popular.getByRole("button")).toHaveCount(6);
  const epfo = popular.getByRole("button", { name: "EPFO" });
  await epfo.click();
  await expect(epfo).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("selected-authority")).toContainText("Employees' Provident Fund Organisation");
});

test("Browse all groups authorities by ministry and searches names, ministries and topics, in Hindi too", async ({ page }) => {
  await toPicker(page);
  const browse = page.getByRole("button", { name: `Browse all ${authorities.length} authorities` });
  await expect(browse).toHaveAttribute("aria-expanded", "false");
  await browse.click();
  await expect(browse).toHaveAttribute("aria-expanded", "true");

  const finance = page.getByRole("group", { name: "Ministry of Finance" });
  await expect(finance.getByRole("radio")).toHaveCount(3);

  const search = page.getByRole("searchbox", { name: "Search authorities" });
  await search.fill("पेंशन");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await page.getByRole("radio", { name: /Pension and Pensioners/ }).check();
  await expect(page.getByTestId("selected-authority")).toContainText("Department of Pension and Pensioners' Welfare");

  await search.fill("aadhaar");
  await expect(page.getByRole("radio", { name: /Unique Identification Authority/ })).toBeVisible();

  await search.fill("water tanker for my village");
  await expect(page.getByText("No central authority matches that search.")).toBeVisible();
  await expect(page.getByText(/central government authorities only/)).toBeVisible();
});

test("arrow keys move between authorities in the full list", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "keyboard test on desktop");
  await toPicker(page);
  await page.getByRole("button", { name: /Browse all/ }).click();
  const first = page.getByRole("radio").first();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
});
