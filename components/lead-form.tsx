"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { getNairobiDate } from "@/lib/business-hours";
import type { DemoSlot } from "@/lib/demo-scheduling";

type LeadFormKind = "inquiry" | "demo";
type Success = {
  state: "received" | "confirmed";
  message: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  meetUrl?: string | null;
  calendarInvitationRequested?: boolean;
  confirmationEmailSent?: boolean;
};

export function LeadForm({ kind }: { kind: LeadFormKind }) {
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [resetCount, setResetCount] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Success | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<DemoSlot[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityState, setAvailabilityState] = useState<"idle" | "checking" | "ready" | "error">("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const availabilityRequest = useRef("");
  const isDemo = kind === "demo";
  const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const selectedWeekday = preferredDate ? new Date(`${preferredDate}T00:00:00.000Z`).getUTCDay() : null;

  useEffect(() => {
    if (!isDemo || !preferredDate || !token || availabilityDate === preferredDate) return;
    const date = preferredDate;
    const turnstileToken = token;
    const requestKey = `${date}:${turnstileToken}`;
    if (availabilityRequest.current === requestKey) return;
    availabilityRequest.current = requestKey;
    const controller = new AbortController();
    fetch("/api/askanpharma/demo/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, turnstileToken }),
      signal: controller.signal,
    }).then(async response => {
      const result = await response.json() as { slots?: DemoSlot[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "We couldn't check demo availability right now. Please try again shortly.");
      setToken("");
      setResetCount(value => value + 1);
      setAvailabilityDate(date);
      setAvailableSlots(result.slots ?? []);
      setAvailabilityState("ready");
    }).catch(caught => {
      if (controller.signal.aborted) return;
      setToken("");
      setResetCount(value => value + 1);
      setAvailabilityDate(date);
      setAvailabilityError(caught instanceof Error ? caught.message : "We couldn't check demo availability right now. Please try again shortly.");
      setAvailabilityState("error");
    });
    return () => controller.abort();
  }, [availabilityDate, isDemo, preferredDate, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setError("");
    setSuccess(null);
    if (!token) {
      setError("Complete the Cloudflare security check before submitting.");
      return;
    }
    setPending(true);
    const formData = new FormData(form);
    // Turnstile adds its own hidden form field. The API accepts the token only
    // through `turnstileToken`, populated from the verified widget callback.
    const payload = Object.fromEntries([...formData.entries()].filter(([name]) => name !== "cf-turnstile-response"));
    const requestKey = idempotencyKey || (isDemo ? crypto.randomUUID() : "");
    if (isDemo && !idempotencyKey) setIdempotencyKey(requestKey);
    try {
      const response = await fetch(isDemo ? "/api/askanpharma/demo/bookings" : "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(isDemo ? { "Idempotency-Key": requestKey } : {}) },
        body: JSON.stringify({ ...payload, ...(isDemo ? {} : { kind }), turnstileToken: token }),
      });
      const result = await response.json() as {
        state?: "confirmed" | "request_received";
        message?: string;
        error?: string;
        fields?: Record<string, string>;
        code?: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        meetUrl?: string | null;
        calendarInvitationRequested?: boolean;
        confirmationEmailSent?: boolean;
      };
      if (!response.ok) {
        setFieldErrors(result.fields ?? {});
        if (isDemo && result.code === "slot_unavailable") {
          setPreferredTime("");
          setAvailableSlots([]);
          setAvailabilityDate("");
          setAvailabilityState("idle");
          setIdempotencyKey("");
        }
        throw new Error(result.error ?? "We could not send your request. Please try again.");
      }
      setSuccess({
        state: result.state === "confirmed" ? "confirmed" : "received",
        message: result.message ?? "Request received.",
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        meetUrl: result.meetUrl,
        calendarInvitationRequested: result.calendarInvitationRequested,
        confirmationEmailSent: result.confirmationEmailSent,
      });
      if (!isDemo) form.reset();
      if (!isDemo) {
        setPreferredDate("");
        setPreferredTime("");
      }
      setToken("");
      setResetCount(value => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your request. Please try again.");
      setToken("");
      setResetCount(value => value + 1);
    } finally {
      setPending(false);
    }
  }

  function changeDate(date: string) {
    setPreferredDate(date);
    // A date refresh may abort a verification request after Turnstile has
    // consumed its token. Always obtain a fresh token for the next lookup.
    setToken("");
    setResetCount(value => value + 1);
    setPreferredTime("");
    setAvailableSlots([]);
    setAvailabilityDate("");
    setAvailabilityError("");
    setAvailabilityState(date ? "checking" : "idle");
    setIdempotencyKey("");
    if (date && new Date(`${date}T00:00:00.000Z`).getUTCDay() === 0) {
      setAvailabilityDate(date);
      setAvailabilityState("error");
      setAvailabilityError("Virtual demos are not available on Sundays. Please choose another date.");
    }
  }

  return (
    <form id={isDemo ? "demo-request-form" : "enquiry-form"} className="contact-form lead-form" onChange={() => { setError(""); setFieldErrors({}); if (isDemo && !pending) setIdempotencyKey(""); }} onSubmit={submit}>
      <div className="form-grid">
        <label>Full name <span aria-hidden="true">*</span><input name="name" autoComplete="name" required maxLength={120} placeholder="Your name" /></label>
        <label>{isDemo ? "Pharmacy / Business name" : "Business / Organization"}{isDemo && <> <span aria-hidden="true">*</span></>}<input name="organization" autoComplete="organization" required={isDemo} maxLength={160} placeholder={isDemo ? "Pharmacy or business" : "Organization name (optional)"} /></label>
        <label>Email address <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
        <label>Phone number{isDemo && <> <span aria-hidden="true">*</span></>} {!isDemo && <small>(optional)</small>}<input name="phone" type="tel" autoComplete="tel" required={isDemo} maxLength={40} placeholder="+254..." /></label>
      </div>
      {isDemo ? <>
        <div className="form-grid">
          <label>Town / Location <small>(optional)</small><input name="town" autoComplete="address-level2" maxLength={120} /></label>
          <label>Number of pharmacy branches <small>(optional)</small><input name="branches" type="number" min="1" max="10000" step="1" inputMode="numeric" /></label>
          <label>Demo date <span aria-hidden="true">*</span><input name="preferredDate" type="date" min={getNairobiDate()} required value={preferredDate} disabled={availabilityState === "checking"} onChange={event => changeDate(event.target.value)} /></label>
          <label>Available demo time <span aria-hidden="true">*</span><select name="preferredTime" required value={preferredTime} disabled={availabilityState !== "ready" || selectedWeekday === 0} onChange={event => { setPreferredTime(event.target.value); setIdempotencyKey(""); }}><option value="" disabled>{selectedWeekday === 0 ? "Sunday is closed" : availabilityState === "checking" ? "Checking availability…" : availabilityState === "error" ? "Availability unavailable" : availabilityState !== "ready" ? "Select a date to check times" : "Select an available time"}</option>{availableSlots.map(slot => <option value={slot.time} key={slot.start}>{slot.label}</option>)}</select></label>
        </div>
        <p className="field-hint" role="status">Available times are shown in East Africa Time (EAT). Demos last 30 minutes and use Google Meet. Availability may change until your booking is confirmed.</p>
        {availabilityState === "checking" && <p role="status">Checking availability…</p>}
        {availabilityState === "ready" && availableSlots.length === 0 && <p role="status">No demo times are available on this date. Please choose another date.</p>}
        {availabilityState === "error" && <div className="form-error" role="alert"><p>{availabilityError || "We couldn't check demo availability right now. Please try again shortly."}</p>{selectedWeekday !== 0 && <button className="button button-outline" type="button" disabled={!token} onClick={() => { setAvailabilityDate(""); setAvailabilityState("idle"); }}>{token ? "Retry availability" : "Complete the security check to retry"}</button>}</div>}
        <label>Preferred contact method <select name="preferredContact" defaultValue="Email"><option>Email</option><option>Phone</option><option>WhatsApp</option></select></label>
        <label>What would you like to see? <textarea name="message" rows={4} maxLength={2000} placeholder="Share the pharmacy workflow or product area you would like us to cover. Do not include patient, medical, password, or payment information." /></label>
      </> : <>
        <label>Enquiry type <select name="interest" defaultValue="General Enquiry"><option>General Enquiry</option><option>Virtual Consultation</option><option>Custom Software</option><option>Business Systems</option><option>Mobile Applications</option><option>Web Applications</option><option>Enterprise Systems</option><option>Technology Solutions</option><option>AskanPharma</option><option>Something else</option></select></label>
        <label>Message <span aria-hidden="true">*</span><textarea name="message" rows={6} required minLength={10} maxLength={2000} placeholder="Tell us what you are working on and how we can help." /></label>
      </>}
      <label className="lead-trap" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {turnstileConfigured ? <div className="lead-verification"><TurnstileWidget onToken={setToken} resetCount={resetCount} /><p>We use Cloudflare Turnstile to help prevent automated submissions.</p></div> : <p className="form-error" role="status">Secure form verification is not configured here yet. Please contact us directly using the options on this page.</p>}
      {error && <div className="form-error" role="alert"><p>{error}</p>{Object.keys(fieldErrors).length > 0 && <ul>{Object.entries(fieldErrors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul>}</div>}
      {success && <div className="lead-success" role="status" aria-live="polite"><h2>{isDemo ? success.state === "confirmed" ? "Demo confirmed." : "Request received." : "Enquiry received."}</h2><p>{success.message}</p>{isDemo && success.state === "confirmed" && <><p>{success.date}<br />{success.startTime}–{success.endTime} EAT<br />Duration: 30 minutes<br />Platform: Google Meet</p>{success.meetUrl && <p><a href={success.meetUrl} target="_blank" rel="noopener noreferrer">Join Google Meet</a></p>}{success.calendarInvitationRequested && <p>You’ll also receive a Google Calendar invitation.</p>}{success.confirmationEmailSent && <p>A confirmation email has been sent to the address you provided.</p>}</>}{isDemo && success.state === "received" && <><p>Your preferred date and time are a request only. Abuto Systems will contact you to confirm availability.</p><button className="button button-outline" type="button" disabled={!token || pending} onClick={event => { setSuccess(null); event.currentTarget.form?.requestSubmit(); }}>{token ? "Try scheduling again" : "Complete the security check to retry"}</button></>}</div>}
      <button className="button button-green form-button" type="submit" disabled={pending || (isDemo && availabilityState === "checking") || !turnstileConfigured}>{pending ? "Sending request…" : isDemo ? "Request a Demo" : "Send Enquiry"}<span aria-hidden="true">↗</span></button>
      <p className="form-disclaimer">{isDemo ? <>Only the confirmed state above books an appointment. Please do not submit patient, prescription, medical, password, or payment information. See our <a href="/privacy">Privacy Policy</a>.</> : <>We use the details you provide to respond to your enquiry. Please do not include sensitive information. See our <a href="/privacy">Privacy Policy</a>. For an immediate response, use the direct contact options on this page.</>}</p>
    </form>
  );
}
