import { test } from "@playwright/test";
import { expectPath, login, officer } from "./helpers";

test("a new citizen signs in with an emailed code", async ({ page }) => {
  await login(page, `citizen-${Date.now()}@example.com`);
  await expectPath(page, "/requests");
});

test("a nodal officer lands on the nodal dashboard", async ({ page }) => {
  await login(page, officer("DOPAT", "nodal"));
  await expectPath(page, "/officer/nodal");
});
