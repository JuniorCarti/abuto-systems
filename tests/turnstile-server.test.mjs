import assert from "node:assert/strict";
import test from "node:test";
import { verifyTurnstile } from "../lib/turnstile-server.ts";

const secret = "unit-test-secret";
const token = "unit-test-turnstile-token";

function request(hostname = "abutosystems.com") {
  return new Request(`https://${hostname}/api/askanpharma/demo/bookings`, {
    headers: { "CF-Connecting-IP": "192.0.2.10" },
  });
}

test("accepts a valid Turnstile response only for the request hostname", async () => {
  let submitted;
  const verified = await verifyTurnstile(token, request(), secret, async (url, init) => {
    submitted = { url, method: init.method, body: new URLSearchParams(init.body) };
    return Response.json({ success: true, hostname: "abutosystems.com" });
  });

  assert.equal(verified, true);
  assert.equal(submitted.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(submitted.method, "POST");
  assert.equal(submitted.body.get("response"), token);
  assert.equal(submitted.body.get("secret"), secret);
  assert.equal(submitted.body.get("remoteip"), "192.0.2.10");
});

test("fails closed for missing tokens, missing secrets, invalid responses, and host mismatch", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return Response.json({ success: false, hostname: "abutosystems.com" });
  };

  assert.equal(await verifyTurnstile("", request(), secret, fetcher), false);
  assert.equal(await verifyTurnstile(token, request(), undefined, fetcher), false);
  assert.equal(calls, 0);
  assert.equal(await verifyTurnstile(token, request(), secret, fetcher), false);
  assert.equal(await verifyTurnstile(token, request(), secret, async () => Response.json({ success: true, hostname: "attacker.example" })), false);
  assert.equal(await verifyTurnstile(token, request(), secret, async () => new Response("", { status: 503 })), false);
});

test("a consumed Turnstile token is rejected on retry", async () => {
  let submissions = 0;
  const fetcher = async () => {
    submissions += 1;
    if (submissions === 1) return Response.json({ success: true, hostname: "abutosystems.com" });
    return Response.json({ success: false, hostname: "abutosystems.com", "error-codes": ["timeout-or-duplicate"] });
  };

  assert.equal(await verifyTurnstile(token, request(), secret, fetcher), true);
  assert.equal(await verifyTurnstile(token, request(), secret, fetcher), false);
  assert.equal(submissions, 2);
});
