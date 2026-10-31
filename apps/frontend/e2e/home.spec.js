import { test, expect } from "@playwright/test";
import { officialSchemeUrl } from "../src/lib/citizenProfile.js";

test("scheme discovery homepage shows verified opportunities, guidance and responsive navigation", async ({ page }) => {
  expect(officialSchemeUrl("https://scsthub.in/")).toBe("https://scsthub.in/");
  expect(officialSchemeUrl("https://www.scsthub.in/")).toBe("https://www.scsthub.in/");
  for (const hostile of ["https://scsthub.in.attacker.example/", "https://evilscsthub.in/", "https://scsthub.in@attacker.example/", "https://user:password@scsthub.in/", "https://user:password@www.msme.gov.in/", "http://scsthub.in/", "javascript:alert(1)"]) {
    expect(officialSchemeUrl(hostile)).toBeNull();
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Explore Schemes");
  for (const name of ["Explore by Your Needs", "How It Works", "Categories of Support", "Featured Verified Schemes", "Clear Guidance for Your Next Step", "Frequently Asked Questions", "Find Support for Your Next Step"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  const featured = page.getByRole("region", { name: "Featured Verified Schemes" });
  await expect(featured.locator("article")).toHaveCount(3);
  const links = featured.getByRole("link", { name: "Official application guidance", exact: true });
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) await expect(link).toHaveAttribute("href", /^https:\/\/[^/]+\.(gov|nic)\.in\//);
  await page.getByText("Does a match guarantee a benefit?", { exact: true }).click();
  await expect(page.getByText("Missing information stays unknown.", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation menu", exact: true }).click();
  await page.getByRole("link", { name: "Categories", exact: true }).click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole("button", { name: "Artisan support", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Artisan support", exact: true }).click();
  await expect(page.locator("article")).not.toHaveCount(0);
  await page.goto("/categories?q=National%20SC-ST%20Hub");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Official application guidance", exact: true })).toHaveAttribute("href", "https://scsthub.in/");
});
