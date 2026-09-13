import { test, expect } from "@playwright/test";

const ticket = {
  id: "support-test-123", subject: "Document upload problem", message: "The document upload does not complete.",
  status: "open", response: "", created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z",
  replies: [], notifications: [{ event: "ticket_created", status: "unavailable" }],
};

async function supportApi(page, role = "citizen") {
  let current = structuredClone(ticket);
  await page.route("**/api/v1/citizen/me", route => route.fulfill({ json: { id: "support-test-user", role, fullName: "Support Tester", email: "support-user@example.com" } }));
  await page.route("**/api/v1/citizen/sms-consent", route => route.fulfill({ json: { consent: false, live_enabled: false } }));
  await page.route("**/api/v1/citizen/tickets", route => route.fulfill({ json: [current] }));
  await page.route("**/api/v1/citizen/tickets/support-test-123*", route => {
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
  await page.goto("/support");
  await expect(page.getByRole("heading", { name: "Helpdesk queue" })).toBeVisible();
  const conversation = page.getByRole("article");
  await conversation.getByLabel("Response", { exact: true }).fill("Please reduce the file size and retry.");
  await conversation.getByLabel("Status", { exact: true }).selectOption("resolved");
  await conversation.getByRole("button", { name: "Save response" }).click();
  await expect(conversation.getByText("Please reduce the file size and retry.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Refresh tickets" }).click();
  await expect(conversation.getByText("Please reduce the file size and retry.", { exact: true })).toBeVisible();
  await expect(conversation.getByLabel("Status", { exact: true })).toHaveValue("resolved");
});

test("citizen follow-up saves and SMS setup is explained", async ({ page }) => {
  await supportApi(page);
  await page.goto("/support");
  await page.getByLabel("Add a follow-up", { exact: true }).fill("I tried a smaller file and still need help.");
  await page.getByRole("button", { name: "Send follow-up", exact: true }).click();
  await expect(page.getByText("I tried a smaller file and still need help.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send me the website link" })).toBeDisabled();
  await expect(page.getByText("SMS delivery is awaiting setup.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "customercareprashasti@gmail.com" })).toHaveAttribute("href", /^mailto:customercareprashasti@gmail\.com/);
});

test("a ticket API failure keeps the signed-in account and SMS preference usable", async ({ page }) => {
  await supportApi(page);
  await page.route("**/api/v1/citizen/tickets", route => route.fulfill({ status: 503, json: { detail: "Ticket service is temporarily unavailable." } }));
  await page.goto("/support");
  await expect(page.getByRole("alert")).toHaveText("Ticket service is temporarily unavailable.");
  await expect(page.getByRole("button", { name: "Submit ticket", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Opt in to SMS", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Sign in to contact support" })).toHaveCount(0);
});
