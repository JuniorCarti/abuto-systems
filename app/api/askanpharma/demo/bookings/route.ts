import { env } from "cloudflare:workers";
import { bookDemo } from "@/lib/demo-booking-service";
import type { BookingDatabase } from "@/lib/demo-booking-store";
import { validateLead, type LeadPayload } from "@/lib/lead-validation";
import { verifyTurnstile } from "@/lib/turnstile-server";

const maxBodyBytes = 12_000;
const idempotencyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = new Set(["name", "organization", "email", "phone", "town", "branches", "preferredContact", "message", "preferredDate", "preferredTime", "website", "turnstileToken"]);

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Send this request as JSON." }, 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBodyBytes) return json({ error: "This request is too large." }, 413);

  let parsed: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBodyBytes) return json({ error: "This request is too large." }, 413);
    parsed = JSON.parse(text);
  } catch { return json({ error: "Invalid JSON request." }, 400); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Invalid request." }, 400);
  const payload = parsed as Record<string, unknown>;
  if (Object.keys(payload).some(key => !fields.has(key))) return json({ error: "Invalid request." }, 400);
  if (typeof payload.website === "string" && payload.website.trim()) return json({ error: "Unable to accept this request." }, 400);
  const validation = validateLead({ ...payload, kind: "demo" } as LeadPayload);
  if (!validation.valid) return json({ error: "Please check the highlighted form details.", fields: validation.errors }, 400);
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  if (!idempotencyPattern.test(idempotencyKey)) return json({ error: "Refresh the booking form and try again." }, 400);
  if (!await verifyTurnstile(payload.turnstileToken, request, env.TURNSTILE_SECRET_KEY)) return json({ error: "Complete the security check and try again." }, 403);
  if (!env.LEADS_DB) return json({ error: "Scheduling is temporarily unavailable. Please contact us directly." }, 503);

  try {
    const result = await bookDemo(validation.lead, idempotencyKey, {
      database: env.LEADS_DB as unknown as BookingDatabase,
      google: env,
      resendApiKey: env.RESEND_API_KEY,
    });
    if (result.state === "slot_unavailable") return json({ error: result.message, code: "slot_unavailable" }, 409);
    if (result.state === "idempotency_conflict") return json({ error: result.message, code: "idempotency_conflict" }, 409);
    if (result.state === "in_progress") return json({ state: result.state, message: result.message }, 202);
    if (result.state === "request_received") return json({ state: result.state, message: result.message }, 202);
    return json(result as unknown as Record<string, unknown>, 200);
  } catch {
    console.warn("Demo booking request failed.", { reason: "internal_error" });
    return json({ error: "We couldn't complete that request. Please try again or contact us directly." }, 503);
  }
}
