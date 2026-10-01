import { test, expect } from "@playwright/test";
import axe from "axe-core";

const routes = [
  ["/", "Technology"],
  ["/solutions", "Technology for"],
  ["/products", "Products & Projects"],
  ["/products/askanpharma", "Askan"],
  ["/products/askanpharma/pricing", "AskanPharma pricing"],
  ["/products/askanpharma/demo", "Request an"],
  ["/about", "Practical software"],
  ["/contact", "Let’s build"],
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
  ["/cookies", "Cookie Policy"],
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

test("preview pages return production canonicals, security headers, and a real 404", async ({ request }) => {
  for (const [path] of routes) {
    const response = await request.get(path);
    expect(response.status(), `${path} status`).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    if (new URL(response.url()).hostname.endsWith(".workers.dev")) {
      expect(response.headers()["x-robots-tag"]).toBe("noindex");
    }
    const html = await response.text();
    const canonicalPath = path === "/" ? "" : path;
    expect(html).toContain(`rel="canonical" href="https://abutosystems.com${canonicalPath}"`);
    expect(html).not.toMatch(/localhost|workers\.dev/);
  }

  const missing = await request.get("/a-page-that-does-not-exist");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toMatch(/That page/);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("https://abutosystems.com/sitemap.xml");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("https://abutosystems.com/products/askanpharma");
  expect(sitemapXml).toContain("https://abutosystems.com/products/askanpharma/pricing");
  for (const asset of ["/brand/abuto-symbol.png", "/brand/abuto-logo-full.png", "/brand/abuto-social.jpg", "/icon.png", "/projects/lineage-card.webp", "/projects/zaogrid-abuto-brand.webp", "/projects/tari-card.webp", "/projects/gasflow-card.webp"]) {
    const response = await request.get(asset);
    expect(response.status(), `${asset} status`).toBe(200);
    if (new URL(response.url()).hostname.endsWith(".workers.dev")) {
      expect(response.headers()["x-robots-tag"]).toBe("noindex");
    }
  }
});

test("in-app navigation renders routes without missing RSC payloads", async ({ page }) => {
  const failures = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console ${message.text()}`);
  });
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  for (const [name, path] of [["Solutions", "/solutions"], ["Products", "/products"], ["About", "/about"], ["Contact", "/contact"]]) {
    await page.locator("header").getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new URL(path, origin).href);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(failures).toEqual([]);
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

test("About page presents the approved company, team, service areas, and approach", async ({ page }) => {
  await page.goto("/about");
  await expect(page).toHaveTitle("About Abuto Systems | Practical Software Solutions");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "About Abuto Systems | Practical Software Solutions");
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", "About Abuto Systems | Practical Software Solutions");
  await expect(page.locator("main h1")).toContainText("Practical software");
  await expect(page.getByRole("heading", { name: "Make useful technology easier to access." })).toBeVisible();
  for (const title of ["Business Management Systems", "Custom Software", "Digital Platforms", "Software Support & Improvement"]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }

  const coreTeam = page.locator(".about-team-grid");
  await expect(coreTeam.locator(".about-person")).toHaveCount(2);
  await expect(coreTeam).toContainText("Ridge Junior Abuto");
  await expect(coreTeam).toContainText("Founder & Software Engineer");
  await expect(coreTeam).toContainText("Aaron Onyango");
  await expect(coreTeam).toContainText("Co-Founder & Backend Developer");
  await expect(coreTeam.locator(".about-person-portrait span").nth(0)).toHaveText("RA");
  await expect(coreTeam.locator(".about-person-portrait span").nth(1)).toHaveText("AO");
  await expect(page.locator(".about-person--advisor")).toContainText("Steven Abuto");
  await expect(page.locator(".about-person--advisor")).toContainText("Advisor");
  await expect(page.locator(".about-person--advisor .about-person-portrait span")).toHaveText("SA");

  await expect(page.getByText("businesses and organizations across Kenya.")).toBeVisible();
  const serviceAreas = await page.locator(".about-location-list li").allTextContents();
  expect(serviceAreas).toEqual(["Kisumu", "Eldoret", "Nairobi", "Mombasa", "Nakuru"]);
  await expect(page.getByText(/AskanPharma is already being used by pharmacies in Eldoret/)).toBeVisible();
  await expect(page.locator(".about-approach-step")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /Explore Our Projects/ })).toHaveAttribute("href", "/products");
  await expect(page.locator(".about-final-cta").getByRole("heading", { name: "Have a project in mind?" })).toBeVisible();
  await expect(page.locator(".about-final-cta").getByRole("link", { name: /Talk to Us/ })).toHaveAttribute("href", "/contact");
  await expect(page.locator('a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="facebook.com"], a[href*="x.com"]')).toHaveCount(0);
});

test("About page fits desktop, tablet, and mobile widths", async ({ page }) => {
  await page.goto("/about");
  for (const [width, teamColumns] of [[1920, 2], [1440, 2], [1024, 2], [768, 2], [430, 1], [390, 1], [360, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document, `About page horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
    const columns = await page.locator(".about-team-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length);
    expect(columns, `core team columns at ${width}px`).toBe(teamColumns);
  }
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

test("contact page offers virtual hours, a demo pathway, and virtual consultation", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("#main").getByRole("heading", { name: "Virtual hours" })).toBeVisible();
  await expect(page.getByText("Monday–Friday").first()).toBeVisible();
  await expect(page.getByText("Saturday").first()).toBeVisible();
  await expect(page.getByText("East Africa Time (EAT · UTC+3)").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Request an AskanPharma demo/ })).toHaveAttribute("href", "/products/askanpharma/demo");
  await expect(page.getByRole("link", { name: /Virtual consultation/ })).toHaveAttribute("href", "/contact#enquiry-form");
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
  for (const image of await page.locator(".project-card img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  const images = await page.locator("img").evaluateAll((items) => items.map((image) => ({ alt: image.alt, loaded: image.complete && image.naturalWidth > 0 })));
  expect(images.length).toBeGreaterThanOrEqual(2);
  expect(images.every(({ loaded }) => loaded), JSON.stringify(images)).toBe(true);
  const favicon = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(favicon).toBeTruthy();
  const faviconResponse = await page.request.get(favicon);
  expect(faviconResponse.ok()).toBe(true);
  expect(faviconResponse.headers()["content-type"]).toMatch(/image\/png/);
});

test("legal pages have canonical metadata, footer links, and responsive readable layout", async ({ page }) => {
  for (const [path, heading] of [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/cookies", "Cookie Policy"]]) {
    await page.goto(path);
    await expect(page).toHaveTitle(new RegExp(`${heading} \\| Abuto Systems`));
    await expect(page.locator("main h1")).toHaveText(heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://abutosystems.com${path}`);
    await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
    if (path === "/privacy") {
      await expect(page.locator("main")).toContainText("technology brand");
      await expect(page.locator("main")).toContainText("Western Europe");
      await expect(page.locator("main")).toContainText("United States");
      await expect(page.locator("main")).toContainText("adequacy decision, necessity, or consent");
    }
    if (path === "/terms") await expect(page.locator("main")).toContainText("technology brand");
    if (path === "/cookies") await expect(page.locator("main")).toContainText("Pre-clearance is off");
    await expect(page.locator("main")).not.toContainText(/RESEND_API_KEY|TURNSTILE_SECRET_KEY/);
    const footerLinks = page.getByRole("contentinfo").getByRole("navigation", { name: "Legal" });
    for (const [label, href] of [["Privacy", "/privacy"], ["Terms", "/terms"], ["Cookies", "/cookies"]]) {
      await expect(footerLinks.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(sizes.document, `${path} horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
    }
    const firstAnchor = page.locator(".legal-toc a").first();
    await firstAnchor.focus();
    await expect(firstAnchor).toBeFocused();
  }
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

test("contact form collects a real enquiry and gates submission on Turnstile setup", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("combobox", { name: "Enquiry type" })).toHaveValue("General Enquiry");
  await page.locator("input[name=name]").fill("Jamie Test");
  await page.locator("input[name=email]").fill("jamie@example.com");
  await page.locator("textarea[name=message]").fill("We need help planning a practical digital solution for our team.");
  const button = page.getByRole("button", { name: "Send Enquiry" });
  if (await page.locator(".lead-verification").count()) await expect(button).toBeEnabled();
  else {
    await expect(button).toBeDisabled();
    await expect(page.getByText(/Secure form verification is not configured/)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /abutosystems@gmail\.com/ }).first()).toBeVisible();
});

test("demo route checks server availability and explains the booking rules", async ({ page }) => {
  await page.addInitScript(() => {
    let issueToken;
    window.turnstile = {
      render(_target, options) { issueToken = () => options.callback("e2e-turnstile-token"); setTimeout(issueToken, 0); return "e2e-test-widget"; },
      reset() { setTimeout(() => issueToken?.(), 0); },
      remove() {},
    };
  });
  await page.route("**/api/askanpharma/demo/availability", route => route.fulfill({ json: { slots: [
    { start: "2026-10-03T06:00:00.000Z", end: "2026-10-03T06:30:00.000Z", time: "09:00", label: "9:00 AM EAT" },
    { start: "2026-10-03T12:30:00.000Z", end: "2026-10-03T13:00:00.000Z", time: "15:30", label: "3:30 PM EAT" },
  ] } }));
  await page.goto("/products/askanpharma/demo");
  await expect(page.getByRole("heading", { name: /Request an AskanPharma demo/ })).toBeVisible();
  for (const label of ["Full name", "Pharmacy / Business name", "Email address", "Phone number", "Town / Location", "Number of pharmacy branches", "Demo date", "Available demo time", "Preferred contact method"]) {
    await expect(page.getByLabel(new RegExp(label))).toBeVisible();
  }
  await expect(page.locator("#main .virtual-hours-list dt").first()).toBeVisible();
  await expect(page.locator("#main").getByText("East Africa Time (EAT · UTC+3)")).toBeVisible();
  await expect(page.getByText(/does not reserve a time/)).toBeVisible();
  await expect(page.getByText(/Availability may change until your booking is confirmed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Request a Demo" })).toBeEnabled();
  await page.locator('input[name="preferredDate"]').fill("2026-10-03");
  const preferredTime = page.locator('select[name="preferredTime"]');
  await expect(preferredTime.locator("option")).toHaveCount(3);
  await expect(preferredTime.locator("option").nth(1)).toHaveText("9:00 AM EAT");
  await expect(preferredTime.locator("option").last()).toHaveText("3:30 PM EAT");
  await page.locator('input[name="preferredDate"]').fill("2026-10-04");
  await expect(preferredTime).toBeDisabled();
  await page.reload();
  await expect(page.locator("#demo-request-form")).toBeVisible();
});

test("demo booking excludes Turnstile's generated hidden field from the API payload", async ({ page }) => {
  await page.addInitScript(() => {
    let issueToken;
    window.turnstile = {
      render(target, options) {
        const form = target.closest("form");
        const responseField = document.createElement("input");
        responseField.type = "hidden";
        responseField.name = "cf-turnstile-response";
        form.append(responseField);
        issueToken = () => {
          const token = `e2e-turnstile-${Date.now()}-${Math.random()}`;
          responseField.value = token;
          options.callback(token);
        };
        setTimeout(() => issueToken(), 0);
        return "e2e-test-widget";
      },
      reset() { setTimeout(() => issueToken?.(), 0); },
      remove() {},
    };
  });

  const availabilityTokens = [];
  await page.route("**/api/askanpharma/demo/availability", async route => {
    const { date, turnstileToken } = route.request().postDataJSON();
    availabilityTokens.push(turnstileToken);
    await route.fulfill({ json: { slots: [
      { start: `${date}T07:00:00.000Z`, end: `${date}T07:30:00.000Z`, time: "10:00", label: "10:00 AM EAT" },
    ] } });
  });

  const submitted = [];
  await page.route("**/api/askanpharma/demo/bookings", async route => {
    const request = route.request();
    submitted.push({ payload: request.postDataJSON(), headers: await request.allHeaders() });
    await route.fulfill({ status: 202, json: { state: "request_received", message: "Request received." } });
  });

  await page.goto("/products/askanpharma/demo");
  await page.locator('input[name="name"]').fill("Abuto E2E Lead");
  await page.locator('input[name="organization"]').fill("E2E Pharmacy");
  await page.locator('input[name="email"]').fill("e2e-abuto@example.com");
  await page.locator('input[name="phone"]').fill("+254700000000");
  await page.locator('textarea[name="message"]').fill("I need to see the Pharmacy Workflow");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const nextDate = new Date(`${today}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  while (nextDate.getUTCDay() === 0) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const date = nextDate.toISOString().slice(0, 10);
  await page.locator('input[name="preferredDate"]').fill(date);
  await expect(page.locator('select[name="preferredTime"] option')).toHaveCount(2);

  const refreshedDate = new Date(`${date}T00:00:00.000Z`);
  refreshedDate.setUTCDate(refreshedDate.getUTCDate() + 1);
  while (refreshedDate.getUTCDay() === 0) refreshedDate.setUTCDate(refreshedDate.getUTCDate() + 1);
  const secondDate = refreshedDate.toISOString().slice(0, 10);
  await page.locator('input[name="preferredDate"]').fill(secondDate);
  await expect.poll(() => availabilityTokens.length).toBe(2);
  await expect(page.locator('select[name="preferredTime"] option')).toHaveCount(2);
  await page.locator('select[name="preferredTime"]').selectOption("10:00");
  await page.getByRole("button", { name: "Request a Demo" }).click();

  await expect.poll(() => submitted.length).toBe(1);
  const { payload, headers } = submitted[0];
  expect(availabilityTokens[0]).not.toBe(availabilityTokens[1]);
  expect(payload.turnstileToken).not.toBe(availabilityTokens[1]);
  expect(payload).not.toHaveProperty("cf-turnstile-response");
  expect(payload.turnstileToken).toMatch(/^e2e-turnstile-/);
  expect(payload.preferredDate).toBe(secondDate);
  expect(payload.preferredTime).toBe("10:00");
  expect(payload.message).toBe("I need to see the Pharmacy Workflow");
  expect(headers["content-type"]).toMatch(/^application\/json/);
  expect(headers["idempotency-key"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("booking API maps an unexpected form field to the observed Invalid request response", async ({ page }) => {
  const response = await page.request.post("/api/askanpharma/demo/bookings", {
    headers: { "Idempotency-Key": "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7" },
    data: {
      name: "Abuto E2E Lead", organization: "E2E Pharmacy", email: "e2e-abuto@example.com",
      phone: "+254700000000", town: "", branches: "", preferredDate: "2030-01-01",
      preferredTime: "10:00", preferredContact: "Email", message: "I need to see the Pharmacy Workflow",
      website: "", turnstileToken: "e2e-turnstile-token", "cf-turnstile-response": "e2e-turnstile-token",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: "Invalid request." });
});

test("demo availability and booking reject missing Turnstile tokens", async ({ page }) => {
  await page.addInitScript(() => {
    window.turnstile = { render() { return "e2e-test-widget"; }, reset() {}, remove() {} };
  });
  await page.goto("/products/askanpharma/demo");
  await page.locator('input[name="name"]').fill("Abuto E2E Lead");
  await page.locator('input[name="organization"]').fill("E2E Pharmacy");
  await page.locator('input[name="email"]').fill("e2e-abuto@example.com");
  await page.locator('input[name="phone"]').fill("+254700000000");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const nextDate = new Date(`${today}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  while (nextDate.getUTCDay() === 0) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const date = nextDate.toISOString().slice(0, 10);
  const availability = await page.request.post("/api/askanpharma/demo/availability", { data: { date, turnstileToken: "" } });
  expect(availability.status()).toBe(403);
  await expect(availability.json()).resolves.toMatchObject({ error: "Complete the security check and try again." });
  const response = await page.request.post("/api/askanpharma/demo/bookings", {
    headers: { "Idempotency-Key": "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7" },
    data: {
      name: "Abuto E2E Lead", organization: "E2E Pharmacy", email: "e2e-abuto@example.com",
      phone: "+254700000000", town: "", branches: "", preferredDate: date,
      preferredTime: "10:00", preferredContact: "Email", message: "", website: "", turnstileToken: "",
    },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: "Complete the security check and try again." });
  const bypass = await page.request.post("/api/leads", { data: { kind: "demo", name: "Abuto E2E Lead" } });
  expect(bypass.status()).toBe(400);
});

test("AskanPharma inquiry CTA opens WhatsApp with product context", async ({ page }) => {
  await page.goto("/products/askanpharma");
  await expect(page.getByRole("link", { name: "Request a Demo" })).toHaveAttribute("href", "/products/askanpharma/demo");
  await expect(page.getByRole("link", { name: "View pricing & free trial" })).toHaveAttribute("href", "/products/askanpharma/pricing");
  const link = page.getByRole("link", { name: "Ask about AskanPharma on WhatsApp" });
  const url = new URL(await link.getAttribute("href"));
  expect(url.origin + url.pathname).toBe("https://wa.me/254113245740");
  expect(url.searchParams.get("text")).toContain("pharmacy management system");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("AskanPharma pricing calculator matches approved totals and fits mobile widths", async ({ page }) => {
  await page.goto("/products/askanpharma/pricing");
  await expect(page).toHaveTitle("AskanPharma Pricing | Abuto Systems");
  await expect(page.getByRole("heading", { name: /AskanPharma pricing.*Made simple/i })).toBeVisible();
  await expect(page.getByText("Try AskanPharma free for 21 days, then choose monthly or annual billing.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /KES 1,500\/month/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /KES 15,000\/year/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /subscription totals by device count/i }).getByRole("row")).toHaveCount(6);

  const calculator = page.getByRole("region", { name: "See your total" });
  const count = page.getByRole("spinbutton", { name: "Number of devices" });
  await count.fill("3");
  await expect(calculator.locator(".pricing-result").nth(0)).toContainText("KES 2,500");
  await expect(calculator.locator(".pricing-result").nth(1)).toContainText("KES 25,000");
  await expect(calculator.locator(".pricing-result-onboarding")).toContainText("FREE");
  await count.fill("5");
  await expect(calculator.locator(".pricing-result-onboarding")).toContainText("KES 1,000 one-time");
  await count.fill("0");
  await expect(count).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("status").filter({ hasText: /Enter a whole number from 1 to 100/ })).toBeVisible();

  for (const width of [320, 375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(size.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
  }
});

test("trial CTA submits a Turnstile-protected request for manual setup through the existing lead intake", async ({ page }) => {
  await page.addInitScript(() => {
    let issueToken;
    window.turnstile = {
      render(_target, options) { issueToken = () => options.callback("e2e-trial-turnstile-token"); setTimeout(issueToken, 0); return "e2e-trial-widget"; },
      reset() { setTimeout(() => issueToken?.(), 0); },
      remove() {},
    };
  });
  let submittedPayload;
  await page.route("**/api/leads", async route => {
    submittedPayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { received: true, message: "Trial request received. We’ll contact you to help set up your 21-day AskanPharma trial." } });
  });
  await page.goto("/products/askanpharma/pricing");
  await page.getByRole("link", { name: "Start 21-Day Free Trial" }).click();
  await expect(page).toHaveURL(/#trial-request$/);
  await page.locator("#trial-request-form input[name=name]").fill("E2E Pharmacy Owner");
  await page.locator("#trial-request-form input[name=organization]").fill("E2E Pharmacy");
  await page.locator("#trial-request-form input[name=email]").fill("e2e-trial@example.com");
  await page.getByRole("button", { name: "Request Trial Setup" }).click();
  await expect(page.getByRole("heading", { name: "Trial request received." })).toBeVisible();
  await expect(page.getByText(/does not automatically start a trial/)).toBeVisible();
  expect(submittedPayload.kind).toBe("trial");
  expect(submittedPayload.interest).toBe("AskanPharma trial request");
  expect(submittedPayload.turnstileToken).toBe("e2e-trial-turnstile-token");
  await expect(page.locator("#trial-request-form")).toBeVisible();
});

test("key pages meet WCAG 2.2 A and AA automated checks", async ({ page }) => {
  test.setTimeout(60_000);
  for (const [path] of routes) {
    await page.goto(path);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
    expect(results.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, targets: nodes.flatMap(node => node.target) })), path).toEqual([]);
  }
});
