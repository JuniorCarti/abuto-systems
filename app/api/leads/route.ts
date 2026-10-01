import { env } from "cloudflare:workers";
import { validateLead, type LeadPayload } from "@/lib/lead-validation";
import { storeLeadAndNotify } from "@/lib/lead-notification";
import { verifyTurnstile } from "@/lib/turnstile-server";

const maxBodyBytes = 12_000;

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
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
  if (validation.lead.kind === "demo") return json({ error: "AskanPharma demos must use the availability-backed booking form." }, 409);
  if (!await verifyTurnstile(payload.turnstileToken, request, env.TURNSTILE_SECRET_KEY)) {
    return json({ error: "Complete the security check and try again." }, 403);
  }
  if (!env.LEADS_DB) return json({ error: "Form submissions are temporarily unavailable. Please use the direct contact options." }, 503);

  try {
    const stored = await storeLeadAndNotify(env.LEADS_DB, env.RESEND_API_KEY, validation.lead);
    if (!stored) return json({ error: "We could not save your request. Please try again or contact us directly." }, 503);
  } catch {
    return json({ error: "We could not save your request. Please try again or contact us directly." }, 503);
  }

  const message = validation.lead.interest === "AskanPharma trial request"
    ? "Trial request received. We’ll contact you to help set up your 21-day AskanPharma trial."
    : "Request received. We’ll contact you to confirm the next steps; this is not a booked appointment.";
  return json({ received: true, message }, 201);
}

export async function GET() {
  return json({ error: "Method not allowed." }, 405);
}

export const dynamic = "force-dynamic";
