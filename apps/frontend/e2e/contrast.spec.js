import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public routes have no serious color-contrast violations", async ({ page }) => {
  const paths = ["/", "/find-schemes", "/categories", "/resources", "/about", "/graph", "/ai-assistant"];

  for (const path of paths) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    expect(results.violations, `color-contrast violation on ${path}`).toEqual([]);
  }
});
