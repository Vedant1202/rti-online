import { test, expect } from "@playwright/test";
import { as, fileViaUi, moveClock, officer } from "./helpers";

test.afterEach(async ({ request }) => {
  await request.post("/api/test/clock", { data: { days: 0 } });
});

const vp = (name: string) => (name === "mobile" ? { width: 375, height: 812 } : undefined);

test("golden path 2: split to 2 CPIOs, one replies, one asks a fee, citizen pays, clock resumes", async ({ browser }, info) => {
  const viewport = vp(info.project.name);
  const citizen = await as(browser, `lata-${Date.now()}@example.com`, viewport);
  const subject = `Gratuity records ${Date.now()}`;
  const { url, regNo } = await fileViaUi(citizen, {
    authority: /Pension and Pensioners/,
    subject,
    body: "Copies of file notings on my gratuity (PPO 9921) and the pension sanction order.",
  });

  const nodal = await as(browser, officer("DOPPW", "nodal"), viewport);
  await nodal.goto("/officer/nodal");
  await nodal.getByRole("link", { name: new RegExp(subject) }).click();
  await nodal.getByRole("checkbox", { name: /Section A/ }).check();
  await nodal.getByRole("checkbox", { name: /Section B/ }).check();
  await nodal.getByRole("button", { name: "Split into 2 parts" }).click();
  await expect(nodal.getByTestId("timeline")).toContainText("Sent to 2 officers");

  // Part 1: CPIO A replies.
  const cpioA = await as(browser, officer("DOPPW", "cpio1"), viewport);
  await cpioA.goto("/officer/cpio");
  await cpioA.getByRole("link", { name: new RegExp(subject) }).click();
  await cpioA.getByLabel("Reply to the applicant").fill("File notings attached as sent by the section.");
  await cpioA.getByRole("button", { name: "Send reply" }).click();
  await expect(cpioA.getByTestId("timeline")).toContainText("Reply received");

  // Part 2: CPIO B asks for 12 pages at ₹2.
  const cpioB = await as(browser, officer("DOPPW", "cpio2"), viewport);
  await cpioB.goto("/officer/cpio");
  await cpioB.getByRole("link", { name: new RegExp(subject) }).click();
  await cpioB.getByRole("tab", { name: "Ask for fee" }).click();
  await cpioB.getByLabel("Qty").fill("12");
  await expect(cpioB.getByTestId("fee-total")).toHaveText("Total: ₹24");
  await cpioB.getByRole("button", { name: "Send fee request" }).click();
  await expect(cpioB.getByText("Waiting for the additional fee")).toBeVisible();

  // Citizen sees two parts under one case and pays the fee on part 2 after 5 days.
  await citizen.goto(url);
  await expect(citizen.getByText(`${regNo}/1`)).toBeVisible();
  await citizen.getByRole("link", { name: new RegExp(`${regNo}/2`.replace(/\//g, "\\/")) }).click();
  await expect(citizen.getByTestId("fee-breakdown")).toContainText("₹24");
  await expect(citizen.getByText(/Clock paused/)).toBeVisible();
  await moveClock(citizen, 5);
  await citizen.reload();
  await expect(citizen.getByText(/Clock paused · 30 days left/)).toBeVisible();
  await citizen.getByRole("link", { name: "Pay ₹24" }).click();
  await citizen.getByRole("button", { name: "Pay ₹24" }).click();
  await citizen.getByRole("button", { name: /Visa ending in 4242/ }).click();
  await citizen.getByRole("button", { name: "Pay ₹24" }).click();
  await expect(citizen.getByTestId("timeline")).toContainText("Additional fee paid: ₹24");
  // 5 unpaid days don't count: 30 days were left when paused, still 30 now.
  await expect(citizen.getByText("30 days left", { exact: true })).toBeVisible();

  // CPIO B replies; the part shows Replied.
  await cpioB.goto("/officer/cpio");
  await cpioB.getByRole("link", { name: new RegExp(subject) }).click();
  await cpioB.getByLabel("Reply to the applicant").fill("Sanction order copy (12 pages) sent.");
  await cpioB.getByRole("button", { name: "Send reply" }).click();
  await citizen.reload();
  await expect(citizen.getByText("Replied", { exact: true })).toBeVisible();
});

test("golden path 3: no reply in 30 days → one-click appeal → FAA extends → decides", async ({ browser }, info) => {
  const viewport = vp(info.project.name);
  const citizen = await as(browser, `kiran-${Date.now()}@example.com`, viewport);
  const subject = `Platform lift tender ${Date.now()}`;
  const { url } = await fileViaUi(citizen, {
    authority: /Railways/,
    subject,
    body: "Copies of the tender documents for the lift at platform 3, Pune station.",
  });
  await expect(citizen.getByTestId("appeal-opens")).toBeVisible();

  const nodal = await as(browser, officer("MORLY", "nodal"), viewport);
  await nodal.goto("/officer/nodal");
  await nodal.getByRole("link", { name: new RegExp(subject) }).click();
  await nodal.getByRole("checkbox", { name: /Section A/ }).check();
  await nodal.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(nodal.getByTestId("timeline")).toContainText("Forwarded");

  await moveClock(citizen, 31);
  await citizen.goto(url);
  await expect(citizen.getByText(/Overdue by/)).toBeVisible();
  await citizen.getByRole("link", { name: "File first appeal" }).click();
  await expect(citizen.getByRole("radio", { name: /No response within the time limit/ })).toBeChecked();
  await expect(citizen.getByLabel("Your appeal")).toHaveValue(/has not replied within the 30 days/);
  await citizen.getByRole("button", { name: "Submit appeal" }).click();
  await expect(citizen.getByTestId("appeal-reg-no")).toHaveText(/^MORLY\/A\/E\/\d{2}\/\d{5}$/);

  const faa = await as(browser, officer("MORLY", "faa"), viewport);
  await faa.goto("/officer/faa");
  await faa.getByRole("link", { name: new RegExp(subject) }).click();
  await faa.getByLabel(/Extend to 45 days/).fill("Tender file is with the divisional office.");
  await faa.getByRole("button", { name: "Extend deadline" }).click();
  await expect(faa.getByTestId("faa-clock")).toContainText("extended to 45 days");
  await expect(faa.getByRole("button", { name: "Extend deadline" })).toHaveCount(0);
  await faa.getByLabel("Order", { exact: true }).fill("The CPIO shall provide the tender documents within 15 days.");
  await faa.getByRole("button", { name: "Decide appeal" }).click();
  await expect(faa.getByText("Appeal decided", { exact: true }).first()).toBeVisible();

  await citizen.reload();
  await expect(citizen.getByTestId("faa-clock")).toContainText("Central Information Commission");
});

