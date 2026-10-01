import { env } from "cloudflare:workers";
import type { BookingDatabase } from "@/lib/demo-booking-store";
import { findAvailableDemoSlots } from "@/lib/demo-booking-service";
import { validateAvailabilityDate } from "@/lib/demo-scheduling";
import { verifyTurnstile } from "@/lib/turnstile-server";

const maxBodyBytes = 2_000;

function json(body: Record<string, unknown>, status = 200) {
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

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxBodyBytes) return json({ error: "This request is too large." }, 413);
    payload = JSON.parse(body);
  } catch { return json({ error: "Invalid JSON request." }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Invalid request." }, 400);
  const input = payload as Record<string, unknown>;
  if (Object.keys(input).some(key => key !== "date" && key !== "turnstileToken")) return json({ error: "Invalid request." }, 400);
  const dateError = validateAvailabilityDate(input.date);
  if (dateError) return json({ error: dateError }, 400);
  if (!await verifyTurnstile(input.turnstileToken, request, env.TURNSTILE_SECRET_KEY)) return json({ error: "Complete the security check and try again." }, 403);
  if (!env.LEADS_DB) return json({ error: "Availability is temporarily unavailable. Please try again shortly." }, 503);

  try {
    const slots = await findAvailableDemoSlots(input.date as string, {
      database: env.LEADS_DB as unknown as BookingDatabase,
      google: env,
    });
    return json({ slots: slots.map(({ start, end, time, label }) => ({ start, end, time, label })) });
  } catch {
    return json({ error: "We couldn't check demo availability right now. Please try again shortly." }, 503);
  }
}
