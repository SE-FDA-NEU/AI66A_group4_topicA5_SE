import { test, expect } from "@playwright/test";

const VALID = { monthly_income: 20000000, loan_amount: 100000000, loan_term_months: 24,
  estimated_monthly_payment: 5000000, purpose: "P1/P2 browser fixture", credit_history_note: "3 years, on time", cic_debt_group: 1 };

async function signIn(page, email = "hoang@branch.vn") {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Demo@2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /applications overview|Branch review overview/ })).toBeVisible();
}

async function request(page, path, method = "GET", body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = JSON.parse(sessionStorage.getItem("cs_session")).access_token;
    const response = await fetch(`/api${path}`, { method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Fixture request failed: ${response.status}`);
    return response.status === 204 ? null : response.json();
  }, { path, method, body });
}

async function pendingFixture(page) {
  // The story starts with an unprocessed record. Set up that precondition through
  // the real create API, then perform all edits/cancellation/history actions in UI.
  return request(page, "/loan-applications", "POST", VALID);
}

async function openFromList(page, id, manager = false) {
  await page.getByRole("navigation").getByRole("link", { name: manager ? "Branch applications" : "My applications", exact: true }).click();
  await page.getByRole("row").filter({ hasText: id.slice(0, 8) }).getByRole("link", { name: manager ? "Review" : "Open", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
}

async function capture(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
}

test("US02 logout hides cached pages and revokes only that browser session", async ({ page, browser }) => {
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await signIn(other);
    await signIn(page);
    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cs_session")).access_token);
    await page.getByRole("navigation").getByRole("link", { name: "New application", exact: true }).click();
    const revoked = page.waitForResponse(response => response.url().endsWith("/api/auth/logout"));
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    expect((await revoked).status()).toBe(204);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("cs_session"))).toBeNull();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.locator(".topbar, .tiles")).toHaveCount(0);
    const response = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status()).toBe(401);
    expect((await request(other, "/auth/me")).role).toBe("user");
  } finally { await otherContext.close(); }
});

test("US02 unavailable logout API clears the browser and reports unconfirmed revocation", async ({ page }) => {
  await signIn(page);
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cs_session")).access_token);
  await page.route("**/api/auth/logout", route => route.abort("failed"));
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Signed out of this browser. The server could not confirm session revocation; check your connection before signing in again.",
  );
  expect(await page.evaluate(() => sessionStorage.getItem("cs_session"))).toBeNull();
  await expect(page.locator(".topbar, .tiles")).toHaveCount(0);
  // The blocked request never reached the API: local sign-out must not promise
  // server revocation. This retained token is only a disposable test credential.
  const response = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(response.status()).toBe(200);
});

test("US05 details are reachable from the list and a missing application gives a useful error", async ({ page }) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await expect(page.getByText("20,000,000 VND", { exact: true })).toBeVisible();
  await expect(page.getByText("3 years, on time", { exact: true })).toBeVisible();
  await page.goto("/loan-applications/nonexistent-application");
  await expect(page.getByRole("alert")).toContainText("Application not found");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to the list", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My applications", exact: true })).toBeVisible();
});

test("US06 history tab shows empty state and exactly two persisted attempts", async ({ page }, info) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.getByText("No history available", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Application details", exact: true }).click();
  await page.getByRole("button", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  await page.getByRole("button", { name: "Score again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Score again", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.locator("#history-panel tbody tr")).toHaveCount(2);
  await page.reload();
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.locator("#history-panel tbody tr")).toHaveCount(2);
  await expect(page.locator("#history-panel")).toContainText("rules-v1");
  await capture(page, info, "p1-history-two-attempts");
});

test("US07 Manager receives a new notification and read status survives reopening", async ({ page, browser }, info) => {
  const otherContext = await browser.newContext();
  try {
    await signIn(page, "thanh@branch.vn");
    const baseline = (await request(page, "/notifications")).unread_count;
    const other = await otherContext.newPage();
    await signIn(other);
    const loan = await pendingFixture(other);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const link = page.getByRole("navigation").getByRole("link", { name: `Notifications (${baseline + 1})`, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole("heading", { name: "Review notifications", exact: true })).toBeVisible();
    const row = page.locator(".notification-list li").filter({ hasText: loan.id.slice(0, 8) });
    await expect(row.getByText("Unread", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Mark as read", exact: true }).click();
    await expect(row.getByText("Read", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: `Notifications (${baseline})`, exact: true })).toBeVisible();
    await page.reload();
    await expect(row.getByText("Read", { exact: true })).toBeVisible();
    await capture(page, info, "p2-notifications-read-persisted");
    await row.getByRole("button", { name: "Open application", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
  } finally { await otherContext.close(); }
});

test("US10 edit and confirm cancellation of an unprocessed application", async ({ page }, info) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("button", { name: "Edit application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit application", exact: true })).toBeVisible();
  await page.getByLabel("Monthly income (VND)", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("#edit-monthly_income-error")).toHaveText("Monthly income must be greater than 0 VND.");
  await page.getByLabel("Monthly income (VND)", { exact: true }).fill("9000000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("9,000,000 VND", { exact: true })).toBeVisible();
  await expect(page.locator(".alert.warn").filter({ hasText: "High risk." })).toBeVisible();
  await capture(page, info, "p1-edited-pending-application");
  await page.getByRole("button", { name: "Cancel application", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation", exact: true }).click();
  await expect(page.locator("h1 .badge")).toHaveText("Cancelled");
  await page.reload();
  await expect(page.locator("h1 .badge")).toHaveText("Cancelled");
  await expect(page.getByRole("button", { name: "Get credit score", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await page.getByRole("link", { name: "Open review queue", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: loan.id.slice(0, 8) })).toHaveCount(0);
});

test("US10 an approved application refuses editing in the interface", async ({ page }) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("button", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await openFromList(page, loan.id, true);
  await page.getByRole("button", { name: "Approve application", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.getByText(/Approved by Do Hong Thanh/)).toBeVisible();
  await page.goto(`/loan-applications/${loan.id}/edit`);
  await expect(page.getByRole("alert")).toHaveText("Application already processed, cannot be edited");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
});
