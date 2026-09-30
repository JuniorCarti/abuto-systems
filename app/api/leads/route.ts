import { env } from "cloudflare:workers";
import { validateLead, type LeadPayload } from "@/lib/lead-validation";

const maxBodyBytes = 12_000;

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function verifyTurnstile(token: unknown, request: Request) {
  if (typeof token !== "string" || !token || !env.TURNSTILE_SECRET_KEY) return false;
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string };
    const expectedHostname = new URL(request.url).hostname.toLowerCase();
    const verifiedHostname = result.hostname?.toLowerCase();
    const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
    const hostMatches = verifiedHostname === expectedHostname || (localHostnames.has(verifiedHostname ?? "") && localHostnames.has(expectedHostname));
    return result.success === true && hostMatches;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return json({ error: "Request origin is not allowed." }, 403);
    } catch {
      return json({ error: "Request origin is not allowed." }, 403);
    }
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Send this request as JSON." }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBodyBytes) return json({ error: "This request is too large." }, 413);

  let payload: LeadPayload;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBodyBytes) return json({ error: "This request is too large." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Invalid request." }, 400);
    payload = parsed as LeadPayload;
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  if (typeof payload.website === "string" && payload.website.trim()) return json({ error: "Unable to accept this request." }, 400);
  const validation = validateLead(payload);
  if (!validation.valid) return json({ error: "Please check the highlighted form details.", fields: validation.errors }, 400);
  if (!await verifyTurnstile(payload.turnstileToken, request)) {
    return json({ error: "Complete the security check and try again." }, 403);
  }
  if (!env.LEADS_DB) return json({ error: "Form submissions are temporarily unavailable. Please use the direct contact options." }, 503);

  try {
    const lead = validation.lead;
    const result = await env.LEADS_DB.prepare(`
      INSERT INTO leads (
        id, kind, name, organization, email, phone, town, interest,
        preferred_date, preferred_time, branches, preferred_contact, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), lead.kind, lead.name, lead.organization, lead.email, lead.phone,
      lead.town, lead.interest, lead.preferredDate || null, lead.preferredTime || null,
      lead.branches, lead.preferredContact, lead.message, new Date().toISOString(),
    ).run();
    if (!result.success) return json({ error: "We could not save your request. Please try again or contact us directly." }, 503);
  } catch {
    return json({ error: "We could not save your request. Please try again or contact us directly." }, 503);
  }

  return json({ received: true, message: "Request received. We’ll contact you to confirm the next steps; this is not a booked appointment." }, 201);
}

export async function GET() {
  return json({ error: "Method not allowed." }, 405);
}

export const dynamic = "force-dynamic";
