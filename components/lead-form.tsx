"use client";

import { useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { getNairobiDate, validateDemoSlot } from "@/lib/business-hours";

type LeadFormKind = "inquiry" | "demo";

export function LeadForm({ kind }: { kind: LeadFormKind }) {
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [resetCount, setResetCount] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const isDemo = kind === "demo";
  const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const selectedWeekday = preferredDate ? new Date(`${preferredDate}T00:00:00.000Z`).getUTCDay() : null;
  const officeHours = selectedWeekday === 6 ? { opens: 9, closes: 16 } : { opens: 8, closes: 18 };
  const timeOptions = selectedWeekday === 0 ? [] : Array.from({ length: (officeHours.closes - officeHours.opens) * 2 + 1 }, (_, index) => {
    const minuteOfDay = officeHours.opens * 60 + index * 30;
    return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
  }).filter(time => !preferredDate || validateDemoSlot(preferredDate, time).valid);

  function displayTime(time: string) {
    const [hourText, minute] = time.split(":");
    const hour = Number(hourText);
    return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"} EAT`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setError("");
    setSuccess("");
    if (!token) {
      setError("Complete the Cloudflare security check before submitting.");
      return;
    }
    setPending(true);
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, kind, turnstileToken: token }),
      });
      const result = await response.json() as { message?: string; error?: string; fields?: Record<string, string> };
      if (!response.ok) {
        setFieldErrors(result.fields ?? {});
        throw new Error(result.error ?? "We could not send your request. Please try again.");
      }
      setSuccess(result.message ?? "Request received.");
      form.reset();
      setPreferredDate("");
      setPreferredTime("");
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

  return (
    <form id={isDemo ? "demo-request-form" : "enquiry-form"} className="contact-form lead-form" onChange={() => { setError(""); setFieldErrors({}); }} onSubmit={submit}>
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
          <label>Preferred demo date <span aria-hidden="true">*</span><input name="preferredDate" type="date" min={getNairobiDate()} required value={preferredDate} onChange={event => { setPreferredDate(event.target.value); setPreferredTime(""); }} /></label>
          <label>Preferred demo time <span aria-hidden="true">*</span><select name="preferredTime" required value={preferredTime} disabled={selectedWeekday === 0} onChange={event => setPreferredTime(event.target.value)}><option value="" disabled>{selectedWeekday === 0 ? "Sunday is closed" : "Select EAT time"}</option>{timeOptions.map(time => <option value={time} key={time}>{displayTime(time)}</option>)}</select></label>
        </div>
        <p className="field-hint" role="status">Weekdays: 8:00 AM–6:00 PM. Saturday: 9:00 AM–4:00 PM. Sunday: closed. All times are EAT (UTC+3) and subject to confirmation.</p>
        <label>Preferred contact method <select name="preferredContact" defaultValue="Email"><option>Email</option><option>Phone</option><option>WhatsApp</option></select></label>
        <label>What would you like to see? <textarea name="message" rows={4} maxLength={2000} placeholder="Share the pharmacy workflow or product area you would like us to cover. Do not include patient, medical, password, or payment information." /></label>
      </> : <>
        <label>Enquiry type <select name="interest" defaultValue="General Enquiry"><option>General Enquiry</option><option>Virtual Consultation</option><option>Custom Software</option><option>Business Systems</option><option>Mobile Applications</option><option>Web Applications</option><option>Enterprise Systems</option><option>Technology Solutions</option><option>AskanPharma</option><option>Something else</option></select></label>
        <label>Message <span aria-hidden="true">*</span><textarea name="message" rows={6} required minLength={10} maxLength={2000} placeholder="Tell us what you are working on and how we can help." /></label>
      </>}
      <label className="lead-trap" aria-hidden="true">Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {turnstileConfigured ? <div className="lead-verification"><TurnstileWidget onToken={setToken} resetCount={resetCount} /><p>We use Cloudflare Turnstile to help prevent automated submissions.</p></div> : <p className="form-error" role="status">Secure form verification is not configured here yet. Please contact us directly using the options on this page.</p>}
      {error && <div className="form-error" role="alert"><p>{error}</p>{Object.keys(fieldErrors).length > 0 && <ul>{Object.entries(fieldErrors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul>}</div>}
      {success && <div className="lead-success" role="status" aria-live="polite"><h2>{isDemo ? "Demo request received." : "Enquiry received."}</h2><p>{success}</p>{isDemo && <p>Your preferred date and time are a request only. Abuto Systems will contact you to confirm availability.</p>}</div>}
      <button className="button button-green form-button" type="submit" disabled={pending || !turnstileConfigured}>{pending ? "Sending request…" : isDemo ? "Request a Demo" : "Send Enquiry"}<span aria-hidden="true">↗</span></button>
      <p className="form-disclaimer">{isDemo ? "This request does not book or confirm an appointment. Please do not submit patient, prescription, medical, password, or payment information." : "Your details are stored securely for follow-up. For an immediate response, use the direct contact options on this page."}</p>
    </form>
  );
}
