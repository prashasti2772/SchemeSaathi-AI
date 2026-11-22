import { test, expect } from "@playwright/test";

function luminance([r, g, b]) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

test("light-background muted text meets WCAG AA contrast", async ({ page }) => {
  const paths = ["/", "/find-schemes", "/categories", "/resources", "/about", "/ai-assistant"];

  for (const path of paths) {
    await page.goto(path);

    const failures = await page.evaluate(() => {
      const parseRgb = (value) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const values = match[1].split(",").map((item) => parseFloat(item));
        return [values[0], values[1], values[2], values[3] ?? 1];
      };

      const luminance = ([r, g, b]) => {
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };

      const findBackground = (element) => {
        let current = element;
        while (current) {
          const color = parseRgb(getComputedStyle(current).backgroundColor);
          if (color && color[3] !== 0) return color;
          current = current.parentElement;
        }
        return [255, 255, 255, 1];
      };

      const failures = [];
      for (const element of document.querySelectorAll("[class*='text-slate-400']")) {
        if (!(element instanceof HTMLElement) || !element.textContent?.trim()) continue;
        if (element.offsetParent === null) continue;
        const foreground = parseRgb(getComputedStyle(element).color);
        const background = findBackground(element);
        if (!foreground || !background) continue;
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background);
        const ratio =
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
        if (background[0] > 235 && background[1] > 235 && background[2] > 235 && ratio < 4.5) {
          failures.push({
            text: element.textContent.trim().slice(0, 80),
            ratio: Number(ratio.toFixed(2)),
          });
        }
      }
      return failures;
    });

    expect(failures, `Low-contrast text-slate-400 text on ${path}`).toEqual([]);
  }
});
