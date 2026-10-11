import { test, expect } from "@playwright/test";
import { as, fileViaUi, officer } from "./helpers";

test("file → pay → nodal forwards → CPIO replies → citizen sees the reply", async ({ browser }, info) => {
  const viewport = info.project.name === "mobile" ? { width: 375, height: 812 } : undefined;
  const citizen = await as(browser, `meera-${Date.now()}@example.com`, viewport);
  const subject = `Pension delay ${Date.now()}`;
  const { url, regNo } = await fileViaUi(citizen, {
    authority: /Pension and Pensioners/,
    subject,
    body: "Why is my pension (PPO 4471) delayed since August 2026?",
  });

  const nodal = await as(browser, officer("DOPPW", "nodal"), viewport);
  await nodal.goto("/officer/nodal");
  await nodal.getByRole("link", { name: new RegExp(subject) }).click();
  await expect(nodal.getByText(/Transfer deadline/)).toBeVisible();
  await nodal.getByRole("checkbox", { name: /Section A/ }).check();
  await nodal.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(nodal.getByTestId("timeline")).toContainText("Forwarded to CPIO (Section A)");

  const cpio = await as(browser, officer("DOPPW", "cpio1"), viewport);
  await cpio.goto("/officer/cpio");
  await cpio.getByRole("link", { name: new RegExp(subject) }).click();
  await cpio.getByLabel("Reply to the applicant").fill("Your pension was released on 2 October 2026.");
  await cpio.getByRole("button", { name: "Send reply" }).click();
  await expect(cpio.getByTestId("timeline")).toContainText("Reply received");

  await citizen.goto(url);
  await expect(citizen.getByTestId("reg-no")).toHaveText(regNo);
  await expect(citizen.getByTestId("timeline")).toContainText("Your pension was released on 2 October 2026.");
  await expect(citizen.getByText("Replied", { exact: true })).toBeVisible();
});
