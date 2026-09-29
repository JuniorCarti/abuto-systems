import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 35000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(base); if (response.ok) return; } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Production server did not start within 15 seconds");
}

test("production routes render the company and product hierarchy", async () => {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { cwd: process.cwd(), stdio: "ignore" });
  try {
    await waitForServer();
    const routes = [
      ["/", "Technology", "Abuto Systems"],
      ["/solutions", "Technology for", "Custom Software"],
      ["/products", "Ideas made", "AskanPharma"],
      ["/products/askanpharma", "Askan", "A PRODUCT BY ABUTO SYSTEMS"],
      ["/about", "Simple ideas", "AskanPharma"],
      ["/contact", "something useful", "Prepare inquiry"],
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
    }
    const missing = await fetch(`${base}/a-page-that-does-not-exist`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /That page isn’t here/);
  } finally {
    server.kill();
  }
});
