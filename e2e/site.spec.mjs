import { test, expect } from "@playwright/test";
import axe from "axe-core";

const routes = [
  ["/", "Technology"],
  ["/solutions", "Technology for"],
  ["/products", "Products & Projects"],
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

test("portfolio shows approved project status, ownership, and links", async ({ page }) => {
  await page.goto("/");
  const featured = page.locator(".project-grid--featured .project-card");
  await expect(featured).toHaveCount(3);
  await expect(featured.nth(0)).toHaveAttribute("data-project", "askanpharma");
  await expect(featured.nth(1)).toHaveAttribute("data-project", "lineage");
  await expect(featured.nth(2)).toHaveAttribute("data-project", "zaogrid");

  await page.goto("/products");
  await expect(page.locator(".project-card")).toHaveCount(5);
  await expect(page.locator(".project-card-wordmark")).toContainText("AskanPharma");
  await page.locator(".project-card").last().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(".project-card img").evaluateAll((images) => images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);

  const project = (slug) => page.locator(`.project-card[data-project="${slug}"]`);
  await expect(project("askanpharma")).toContainText("Deployed");
  await expect(project("askanpharma")).toContainText("Abuto Systems product");

  await expect(project("lineage")).toContainText("Deployed");
  const lineageLink = project("lineage").getByRole("link", { name: "Visit Lineage (opens in a new tab)" });
  await expect(lineageLink).toHaveAttribute("href", "https://family-tree-a4c4f.web.app/");
  await expect(lineageLink).toHaveAttribute("target", "_blank");
  await expect(lineageLink).toHaveAttribute("rel", "noopener noreferrer");

  await expect(project("zaogrid")).toContainText("In Development");
  await expect(project("zaogrid")).toContainText("Previously developed as AgriSmart.");
  const zaoLink = project("zaogrid").getByRole("link", { name: "Ask about ZaoGrid on WhatsApp (opens in a new tab)" });
  const zaoUrl = new URL(await zaoLink.getAttribute("href"));
  expect(zaoUrl.origin + zaoUrl.pathname).toBe("https://wa.me/254113245740");
  expect(zaoUrl.searchParams.get("text")).toContain("ZaoGrid");
  await expect(project("zaogrid").locator("img")).toHaveAttribute("alt", /Abuto Systems logo/);

  await expect(project("tari-ubc")).toContainText("Private Project");
  await expect(project("tari-ubc")).toContainText("Owned by UBC — Unique Brand Creatives");
  await expect(project("tari-ubc")).not.toContainText("Abuto Systems product");

  await expect(project("gasflow")).toContainText("In Development");
  await expect(project("gasflow")).toContainText("Client project");
  const gasLink = project("gasflow").getByRole("link", { name: "Ask about GasFlow on WhatsApp (opens in a new tab)" });
  expect(new URL(await gasLink.getAttribute("href")).searchParams.get("text")).toContain("similar project");
  for (const slug of ["lineage", "tari-ubc", "gasflow"]) {
    await expect(project(slug).locator("img")).toHaveAttribute("alt", /.+/);
  }
  for (const imagePath of ["gasflow-card.webp", "lineage-card.webp", "tari-card.webp", "zaogrid-abuto-brand.webp"]) {
    const response = await page.request.get(`/projects/${imagePath}`);
    expect(response.ok(), imagePath).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\/webp/);
  }
});

test("contact options use the approved WhatsApp numbers and email", async ({ page }) => {
  await page.goto("/contact");
  const primary = page.getByRole("link", { name: /WhatsApp \+254 113 245 740/ }).first();
  const secondary = page.getByRole("link", { name: /WhatsApp \+254 101 291 262/ }).first();
  const primaryUrl = new URL(await primary.getAttribute("href"));
  const secondaryUrl = new URL(await secondary.getAttribute("href"));
  expect(primaryUrl.origin + primaryUrl.pathname).toBe("https://wa.me/254113245740");
  expect(secondaryUrl.origin + secondaryUrl.pathname).toBe("https://wa.me/254101291262");
  expect(primaryUrl.searchParams.get("text")).toContain("Hello Abuto Systems,");
  await expect(primary).toHaveAttribute("target", "_blank");
  await expect(primary).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("link", { name: /abutosystems@gmail\.com/ }).first()).toHaveAttribute("href", /^mailto:abutosystems@gmail\.com/);
  const organizationJsonLd = await page.locator('script[type="application/ld+json"]').evaluate((script) => script.textContent);
  expect(organizationJsonLd).toContain('"email":"abutosystems@gmail.com"');
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
  await page.goto("/products");
  for (const [width, columns] of [[320, 1], [360, 1], [375, 1], [390, 1], [430, 1], [768, 2], [1024, 3], [1280, 3], [1440, 3], [1920, 3]]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
    const columnCount = await page.locator(".project-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    expect(columnCount, `portfolio column count at ${width}px`).toBe(columns);
  }
});

test("contact form validates and prepares a clearly unsent inquiry", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText(/This form prepares an inquiry draft\. It does not send messages/)).toBeVisible();
  await page.locator("input[name=name]").fill("Jamie Test");
  await page.locator("input[name=email]").fill("jamie@example.com");
  await page.locator("textarea[name=message]").fill("We need help planning a practical digital solution for our team.");
  await page.getByRole("button", { name: "Prepare inquiry" }).click();
  await expect(page.getByRole("heading", { name: "Your inquiry draft is ready." })).toBeVisible();
  await expect(page.getByLabel("Inquiry draft")).toHaveValue(/Jamie Test/);
});

test("AskanPharma inquiry CTA opens WhatsApp with product context", async ({ page }) => {
  await page.goto("/products/askanpharma");
  const link = page.getByRole("link", { name: "Ask about AskanPharma on WhatsApp" });
  const url = new URL(await link.getAttribute("href"));
  expect(url.origin + url.pathname).toBe("https://wa.me/254113245740");
  expect(url.searchParams.get("text")).toContain("pharmacy management system");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("key pages meet WCAG 2.2 A and AA automated checks", async ({ page }) => {
  for (const [path] of routes) {
    await page.goto(path);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
    expect(results.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, targets: nodes.flatMap(node => node.target) })), path).toEqual([]);
  }
});
