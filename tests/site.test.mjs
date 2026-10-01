import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 35000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { const response = await fetch(base); if (response.ok) return; } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Cloudflare Workers preview did not start within 30 seconds");
}

test("production routes render through Wrangler's local Worker runtime", async () => {
  const server = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--ip", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: { ...process.env, XDG_CONFIG_HOME: join(tmpdir(), "abuto-systems-wrangler-config") },
  });
  try {
    await waitForServer();
    const routes = [
      ["/", "Technology", "Abuto Systems"],
      ["/solutions", "Technology for", "Custom Software"],
      ["/products", "Products", "TARI-UBC"],
      ["/products/askanpharma", "Askan", "A PRODUCT BY ABUTO SYSTEMS"],
      ["/products/askanpharma/pricing", "AskanPharma pricing", "21-Day Free Trial"],
      ["/products/askanpharma/demo", "Request an", "VIRTUAL PRODUCT WALKTHROUGH"],
      ["/about", "Practical software", "Ridge Junior Abuto"],
      ["/contact", "something useful", "Send Enquiry"],
      ["/privacy", "Privacy Policy", "Western Europe"],
      ["/terms", "Terms of Service", "does not by itself create a customer relationship"],
      ["/cookies", "Cookie Policy", "Pre-clearance is off"],
    ];
    for (const [path, heading, content] of routes) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, `${path} status`);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path} content type header`);
      assert.equal(response.headers.get("x-frame-options"), "DENY", `${path} frame header`);
      assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin", `${path} referrer header`);
      const html = await response.text();
      assert.match(html, new RegExp(heading, "i"), `${path} heading`);
      assert.ok(html.includes(content), `${path} content`);
      assert.match(html, /<title>[^<]+<\/title>/, `${path} metadata title`);
      assert.ok(html.includes(`rel="canonical" href="https://abutosystems.com${path === "/" ? "" : path}"`), `${path} production canonical`);
      assert.doesNotMatch(html, /http:\/\/localhost:3000\/brand\/abuto-social\.jpg/, `${path} must not publish a localhost social URL`);
      if (html.includes("/brand/abuto-social.jpg")) {
        assert.match(html, /property="og:image" content="[^"]*\/brand\/abuto-social\.jpg"/, `${path} social preview metadata`);
        assert.match(html, /name="twitter:card" content="summary_large_image"/, `${path} large social card metadata`);
      }
    }
    const symbol = await fetch(`${base}/brand/abuto-symbol.png`);
    assert.equal(symbol.status, 200, "header brand mark asset");
    assert.match(symbol.headers.get("content-type"), /image\/png/);
    const fullLogo = await fetch(`${base}/brand/abuto-logo-full.png`);
    assert.equal(fullLogo.status, 200, "footer full logo asset");
    assert.match(fullLogo.headers.get("content-type"), /image\/png/);
    const socialLogo = await fetch(`${base}/brand/abuto-social.jpg`);
    assert.equal(socialLogo.status, 200, "social preview logo asset");
    assert.match(socialLogo.headers.get("content-type"), /image\/jpeg/);
    const favicon = await fetch(`${base}/icon.png`);
    assert.equal(favicon.status, 200, "brand favicon");
    assert.match(favicon.headers.get("content-type"), /image\/png/);
    for (const asset of ["lineage-card.webp", "zaogrid-abuto-brand.webp", "tari-card.webp", "gasflow-card.webp"]) {
      const response = await fetch(`${base}/projects/${asset}`);
      assert.equal(response.status, 200, `${asset} portfolio asset`);
      assert.match(response.headers.get("content-type"), /image\/webp/);
    }
    const robots = await fetch(`${base}/robots.txt`);
    assert.match(await robots.text(), /Sitemap: https:\/\/abutosystems\.com\/sitemap\.xml/);
    const sitemap = await fetch(`${base}/sitemap.xml`);
    const sitemapXml = await sitemap.text();
    assert.match(sitemapXml, /https:\/\/abutosystems\.com\/products\/askanpharma/);
    assert.match(sitemapXml, /https:\/\/abutosystems\.com\/products\/askanpharma\/demo/);
    assert.match(sitemapXml, /https:\/\/abutosystems\.com\/products\/askanpharma\/pricing/);
    for (const path of ["/privacy", "/terms", "/cookies"]) assert.ok(sitemapXml.includes(`https://abutosystems.com${path}`), `${path} sitemap URL`);
    const unsupportedFormMethod = await fetch(`${base}/api/leads`);
    assert.equal(unsupportedFormMethod.status, 405);
    const invalidLead = await fetch(`${base}/api/leads`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "demo" }) });
    assert.equal(invalidLead.status, 400);
    const invalidLeadResult = await invalidLead.json();
    assert.match(invalidLeadResult.error, /check the highlighted form details/);
    const unverifiedLead = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "inquiry", name: "Jamie Test", email: "jamie@example.com", message: "A valid example inquiry for the endpoint." }),
    });
    assert.equal(unverifiedLead.status, 403, "valid payload is rejected without server-verified Turnstile");
    assert.doesNotMatch(sitemapXml, /localhost|workers\.dev/);
    const missing = await fetch(`${base}/a-page-that-does-not-exist`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /That page isn’t here/);
  } finally {
    server.kill();
  }
});
