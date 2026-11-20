import { test, expect } from "@playwright/test";

const ticket = {
  id: "support-test-123", subject: "Document upload problem", message: "The document upload does not complete.",
  status: "open", response: "", created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z",
  replies: [], notifications: [{ event: "ticket_created", status: "unavailable" }],
};

async function supportApi(page, role = "citizen") {
  let current = structuredClone(ticket);
  await page.addInitScript(() => sessionStorage.setItem("schemeSaathiToken", "isolated-support-fixture-token"));
  await page.route("**/api/v1/citizen/me", route => route.fulfill({ json: { id: "support-test-user", role, fullName: "Support Tester", email: "support-user@example.com" } }));

  await page.route("**/api/v1/citizen/tickets", route => route.fulfill({ json: [current] }));
  await page.route("**/api/v1/citizen/tickets/support-test-123**", route => {
    expect(route.request().headers().authorization).toBe("Bearer isolated-support-fixture-token");
    const payload = route.request().postDataJSON();
    const isStaff = route.request().method() === "PATCH";
    current = { ...current, status: isStaff ? payload.status : "open", replies: [...current.replies, {
      id: "reply-" + current.replies.length, author_role: isStaff ? "support" : "citizen",
      message: isStaff ? payload.response : payload.message, created_at: "2026-09-13T10:01:00Z",
    }] };
    return route.fulfill({ json: current });
  });
}

test("helpdesk reply is shown, persists on refresh, and uses explicit status", async ({ page }) => {
  await supportApi(page, "support");
  await page.goto("/__tests/support?role=support");
  await expect(page.getByRole("heading", { name: "Helpdesk queue" })).toBeVisible();
  const conversation = page.getByRole("article");
  await conversation.getByLabel("Response", { exact: true }).fill("Please reduce the file size and retry.");
  await conversation.getByRole("combobox", { name: "Status", exact: true }).selectOption("resolved");
  await conversation.getByRole("button", { name: "Save response" }).click();
  await expect(conversation.getByText("Please reduce the file size and retry.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh tickets" }).click();
  await expect(conversation.getByText("Please reduce the file size and retry.", { exact: true })).toBeVisible();
  await expect(conversation.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("resolved");
});

test("citizen follow-up persists and public email and AI assistance links are correct", async ({ page }) => {
  await supportApi(page);
  await page.goto("/__tests/support");
  await page.getByLabel("Add a follow-up", { exact: true }).fill("I tried a smaller file and still need help.");
  await page.getByRole("button", { name: "Send follow-up", exact: true }).click();
  await expect(page.getByText("I tried a smaller file and still need help.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  await expect(page.getByText("I tried a smaller file and still need help.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("I tried a smaller file and still need help.", { exact: true })).toBeVisible();
  await page.goto("/support");
  const compose = new URL(await page.getByRole("link", { name: "Write an email", exact: false }).getAttribute("href"));
  expect(compose.origin).toBe("https://mail.google.com");
  expect(compose.searchParams.get("to")).toBe("customercareprashasti@gmail.com");
  expect(compose.searchParams.get("su")).toBe("SchemeSaathi Support Request");
  await expect(page.getByRole("link", { name: /AI Scheme Assistant/ })).toHaveAttribute("href", "/ai-assistant");
  await page.getByText("Does a scheme match guarantee approval?", { exact: true }).click();
  await expect(page.getByText("Final eligibility and approval depend", { exact: false })).toBeVisible();

});

test("a ticket API failure preserves the session and refresh recovers the conversation", async ({ page }) => {
  await supportApi(page);
  const unavailable = route => route.fulfill({ status: 503, json: { detail: "Ticket service is temporarily unavailable." } });
  await page.route("**/api/v1/citizen/tickets", unavailable);
  await page.goto("/__tests/support");
  await expect(page.getByRole("alert")).toHaveText("Ticket service is temporarily unavailable.");
  expect(await page.evaluate(() => sessionStorage.getItem("schemeSaathiToken"))).toBe("isolated-support-fixture-token");
  await expect(page.getByRole("button", { name: "Refresh tickets", exact: true })).toBeEnabled();
  await page.unroute("**/api/v1/citizen/tickets", unavailable);
  await page.getByRole("button", { name: "Refresh tickets", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: ticket.subject, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send follow-up", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem("schemeSaathiToken"))).toBe("isolated-support-fixture-token");
});
