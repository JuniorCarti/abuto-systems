import { test, expect } from "@playwright/test";
import axe from "axe-core";

const routes = [
  ["/", "Technology"],
  ["/solutions", "Technology for"],
  ["/products", "Ideas made"],
  ["/products/askanpharma", "Askan"],
  ["/about", "Simple ideas"],
  ["/contact", "Let’s build"],
];

test("all pages load with useful titles and working primary navigation", async ({ page }) => {
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page).toHaveTitle(/Abuto Systems/);
    await expect(page.locator("main h1").first()).toContainText(heading);
    const brandLink = page.getByRole("banner").getByRole("link", { name: "Abuto Systems" });
    await expect(brandLink).toBeVisible();
    await expect(brandLink.getByRole("img", { name: "Abuto Systems" })).toBeVisible();
  }
  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "That page isn’t here." })).toBeVisible();
});

test("mobile menu opens and closes with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  const solutions = page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Solutions" });
  await solutions.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("company logo link returns to the homepage", async ({ page }) => {
  await page.goto("/products/askanpharma");
  await page.getByRole("banner").getByRole("link", { name: "Abuto Systems" }).click();
  await expect(page).toHaveURL("/");
});

test("logo, footer brand, and favicon load without broken images", async ({ page }) => {
  await page.goto("/");
  const socialImage = page.locator('meta[property="og:image"]');
  if (await socialImage.count()) {
    await expect(socialImage).toHaveAttribute("content", /\/brand\/abuto-social\.jpg$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /\/brand\/abuto-social\.jpg$/);
  } else {
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
  }
  const footerLogo = page.getByRole("contentinfo").getByRole("img", { name: "Abuto Systems — Building practical digital solutions." });
  await footerLogo.scrollIntoViewIfNeeded();
  await expect(footerLogo).toBeVisible();
  await expect.poll(() => footerLogo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  const images = await page.locator("img").evaluateAll((items) => items.map((image) => ({ alt: image.alt, loaded: image.complete && image.naturalWidth > 0 })));
  expect(images.length).toBeGreaterThanOrEqual(2);
  expect(images.every(({ loaded }) => loaded), JSON.stringify(images)).toBe(true);
  const favicon = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(favicon).toBeTruthy();
  const faviconResponse = await page.request.get(favicon);
  expect(faviconResponse.ok()).toBe(true);
  expect(faviconResponse.headers()["content-type"]).toMatch(/image\/png/);
});

test("layout fits the requested viewport widths", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
  }
});

test("contact form validates and prepares a clearly unsent inquiry", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("Message delivery is not configured yet.")).toBeVisible();
  await page.locator("input[name=name]").fill("Jamie Test");
  await page.locator("input[name=email]").fill("jamie@example.com");
  await page.locator("textarea[name=message]").fill("We need help planning a practical digital solution for our team.");
  await page.getByRole("button", { name: "Prepare inquiry" }).click();
  await expect(page.getByRole("heading", { name: "Your inquiry draft is ready." })).toBeVisible();
  await expect(page.getByLabel("Inquiry draft")).toHaveValue(/Jamie Test/);
});

test("key pages meet WCAG 2.2 A and AA automated checks", async ({ page }) => {
  for (const [path] of routes) {
    await page.goto(path);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
    expect(results.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, targets: nodes.flatMap(node => node.target) })), path).toEqual([]);
  }
});
