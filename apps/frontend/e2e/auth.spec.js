import { test, expect } from "@playwright/test";

const captchaImage = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80"><rect width="220" height="80" fill="#fff"/><text x="25" y="54" font-family="monospace" font-size="34" letter-spacing="4" fill="#172b49">TEST42</text></svg>');
const json = (data, status = 200, headers = {}) => ({ status, contentType: "application/json", body: JSON.stringify(data), headers });

async function mockCaptcha(page) {
  let serial = 0;
  await page.route("**/api/v1/citizen/captcha", (route) => route.fulfill(json({ captcha_id: `captcha-${++serial}`, image: captchaImage, expires_in: 300 })));
}

async function requestCode(page) {
  await page.getByLabel("Registered email address", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Enter the characters shown above").fill("TEST42");
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
}

test("duplicate registration explains the conflict and offers account recovery", async ({ page }) => {
  await mockCaptcha(page);
  let submitted;
  await page.route("**/api/v1/citizen/register", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill(json({ detail: "Already registered." }, 409));
  });
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Test Citizen");
  await page.getByLabel("Mobile number", { exact: true }).fill("9876543210");
  await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Password", { exact: true }).fill("  example-password  ");
  await page.getByLabel("Enter the characters shown above").fill("TEST42");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Already registered. An account with this email or mobile number exists.");
  await expect(page.getByRole("alert").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/signin");
  await expect(page.getByRole("alert").getByRole("link", { name: "reset your password" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByLabel("Enter the characters shown above")).toHaveValue("");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("tester@example.com");
  expect(submitted.captcha_answer).toBe("TEST42");
  expect(submitted.captcha_id).toMatch(/^captcha-/);
  expect(submitted.password).toBe("  example-password  ");
});

test("email OTP recovery retries wrong codes, checks confirmation and keeps credentials out of storage", async ({ page }) => {
  await mockCaptcha(page);
  let requestPayload;
  let verified = 0;
  const resets = [];
  await page.route("**/api/v1/citizen/forgot-password", (route) => {
    requestPayload = route.request().postDataJSON();
    return route.fulfill(json({ challenge_id: "test-challenge", message: "If an account exists, an OTP has been sent to its registered email address.", expires_in: 600, resend_after: 60 }));
  });
  await page.route("**/api/v1/citizen/verify-reset-otp", (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.challenge_id).toBe("test-challenge");
    verified++;
    return route.fulfill(payload.otp === "123456" ? json({ token: "test-reset-grant", expires_in: 600 }) : json({ detail: "Incorrect verification code. Try again." }, 400));
  });
  await page.route("**/api/v1/citizen/reset-password", (route) => {
    resets.push(route.request().postDataJSON());
    return route.fulfill(json({ message: "Password updated." }));
  });
  await page.goto("/forgot-password");
  await requestCode(page);
  await expect(page.getByText("If an account exists", { exact: false })).toBeVisible();
  expect(requestPayload).toEqual({ channel: "email", identifier: "tester@example.com", captcha_id: expect.stringMatching(/^captcha-/), captcha_answer: "TEST42" });
  await page.getByLabel("Verification code (OTP)", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Incorrect verification code. Try again.");
  await page.getByLabel("Verification code (OTP)", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByText("Email verified.", { exact: false })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("  example-password  ");
  await page.getByLabel("Confirm new password", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Passwords do not match");
  expect(resets).toHaveLength(0);
  await page.getByLabel("Confirm new password", { exact: true }).fill("  example-password  ");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/signin");
  expect(resets).toEqual([{ token: "test-reset-grant", password: "  example-password  " }]);
  expect(verified).toBe(2);
  expect(page.url()).not.toContain("token");
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  for (const secret of ["123456", "test-reset-grant", "example-password"]) expect(storage).not.toContain(secret);
});

test("CAPTCHA loading and email delivery failures stay on the request step with a retry", async ({ page }) => {
  let captchaRequests = 0;
  await page.route("**/api/v1/citizen/captcha", (route) => route.fulfill(++captchaRequests === 1 ? json({ detail: "Verification is temporarily unavailable." }, 503) : json({ captcha_id: `captcha-${captchaRequests}`, image: captchaImage, expires_in: 300 })));
  await page.route("**/api/v1/citizen/forgot-password", (route) => route.fulfill(json({ detail: "Email delivery is not configured. Please contact support." }, 503)));
  await page.goto("/forgot-password");
  await expect(page.getByRole("alert")).toContainText("Verification is temporarily unavailable");
  await expect(page.getByRole("button", { name: "Send verification code", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Refresh CAPTCHA", exact: true }).click();
  await requestCode(page);
  await expect(page.getByRole("alert")).toHaveText("Email delivery is not configured. Please contact support.");
  await expect(page.getByLabel("Verification code (OTP)", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Enter the characters shown above")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Send verification code", exact: true })).toBeEnabled();
});

test("expired OTP and reset verification offer fresh recovery with CAPTCHA and mobile layout fits", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCaptcha(page);
  let requests = 0;
  await page.route("**/api/v1/citizen/forgot-password", (route) => route.fulfill(json({ challenge_id: `challenge-${++requests}`, message: "If registered, check your email for the OTP.", expires_in: 2, resend_after: 1 })));
  await page.route("**/api/v1/citizen/verify-reset-otp", (route) => route.fulfill(json({ token: "brief-reset-grant", expires_in: 1 })));
  await page.goto("/forgot-password");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await requestCode(page);
  await page.clock.fastForward(3000);
  await expect(page.getByRole("button", { name: "Verify OTP", exact: true })).toBeDisabled();
  await expect(page.getByText("This code has expired", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Request a new code", exact: true }).click();
  await expect(page.getByLabel("Enter the characters shown above")).toHaveValue("");
  await requestCode(page);
  expect(requests).toBe(2);
  await page.getByLabel("Verification code (OTP)", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.clock.fastForward(2000);
  await expect(page.getByText("Your verification has expired.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Start again", exact: true }).click();
  await expect(page.getByLabel("Enter the characters shown above")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("legacy reset URLs require OTP and remove raw tokens from the address bar", async ({ page }) => {
  await mockCaptcha(page);
  let resets = 0;
  await page.route("**/api/v1/citizen/reset-password", (route) => { resets++; return route.abort(); });
  await page.goto("/reset-password?token=legacy-unverified-token");
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("button", { name: "Send verification code", exact: true })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(resets).toBe(0);
});

test("real test server completes registration, email OTP recovery and sign in with the new password", async ({ page }) => {
  const suffix = String(Date.now()).slice(-7);
  const email = `auth-${suffix}@example.com`;
  const originalPassword = "original-test-password";
  const newPassword = "  changed-test-password  ";
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Recovery Browser Tester");
  await page.getByLabel("Mobile number", { exact: true }).fill("976" + suffix);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByLabel("Enter the characters shown above").fill("ABC234");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:8001/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/forgot-password");
  await page.getByLabel("Registered email address", { exact: true }).fill(email);
  await page.getByLabel("Enter the characters shown above").fill("ABC234");
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await page.getByLabel("Verification code (OTP)", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email or mobile number", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:8001/");
});


test("real test server completes registration, mobile OTP recovery and sign in with the new password", async ({ page }) => {
  const suffix = String(Date.now()).slice(-7);
  const email = `mobile-auth-${suffix}@example.com`;
  const originalPassword = "original-test-password";
  const newPassword = "  changed-test-password  ";
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Recovery Browser Tester");
  await page.getByLabel("Mobile number", { exact: true }).fill("975" + suffix);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByLabel("Enter the characters shown above").fill("ABC234");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:8001/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/forgot-password");
  await page.getByLabel("Reset via Mobile Number", { exact: true }).check();
  await page.getByLabel("Registered mobile number", { exact: true }).fill("975" + suffix);
  await page.getByLabel("Enter the characters shown above").fill("ABC234");
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await page.getByLabel("Verification code (OTP)", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify OTP", exact: true }).click();
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Password updated", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email or mobile number", { exact: true }).fill("975" + suffix);
  await page.getByLabel("Password", { exact: true }).fill(originalPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:8001/");
});


test("login connection failure is clear and does not silently replay the request", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/v1/citizen/login", (route) => { attempts++; return route.abort("failed"); });
  await page.goto("/signin");
  await page.getByLabel("Email or mobile number", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Password", { exact: true }).fill("some-test-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to connect to the website service");
  expect(attempts).toBe(1);
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Email or mobile number", { exact: true })).toHaveValue("tester@example.com");
});


test("changing reset method clears the contact and requests a new CAPTCHA", async ({ page }) => {
  await mockCaptcha(page);
  await page.goto("/forgot-password");
  await page.getByLabel("Registered email address", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Enter the characters shown above").fill("TEST42");
  await page.getByLabel("Reset via Mobile Number", { exact: true }).check();
  await expect(page.getByLabel("Registered mobile number", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Enter the characters shown above")).toHaveValue("");
  await expect(page.getByText("receive a six-digit code by SMS", { exact: false })).toBeVisible();
});
