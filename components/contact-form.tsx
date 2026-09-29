"use client";

import { useState, type FormEvent } from "react";

type Fields = { name: string; organization: string; email: string; phone: string; interest: string; message: string };
const initial: Fields = { name: "", organization: "", email: "", phone: "", interest: "", message: "" };

export function ContactForm() {
  const [fields, setFields] = useState<Fields>(initial);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const update = (field: keyof Fields, value: string) => { setFields(previous => ({ ...previous, [field]: value })); setReady(false); setCopied(false); setError(""); };
  const draft = `Inquiry for Abuto Systems\n\nName: ${fields.name}\nOrganization: ${fields.organization || "Not provided"}\nEmail: ${fields.email}\nPhone: ${fields.phone || "Not provided"}\nInterested in: ${fields.interest || "Not specified"}\n\nMessage:\n${fields.message}`;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (fields.message.trim().length < 10) { setError("Please add a little more detail to your message (at least 10 characters)."); return; }
    setReady(true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(draft); setCopied(true); setError(""); }
    catch { setError("Copying was unavailable. Select and copy the draft below instead."); }
  };
  return <form className="contact-form" onSubmit={submit}><div className="form-grid"><label>Name <span aria-hidden="true">*</span><input name="name" autoComplete="name" required value={fields.name} onChange={e => update("name", e.target.value)} placeholder="Your name" /></label><label>Business / Organization<input name="organization" autoComplete="organization" value={fields.organization} onChange={e => update("organization", e.target.value)} placeholder="Organization name" /></label><label>Email <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" required value={fields.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" /></label><label>Phone <small>(optional)</small><input name="phone" type="tel" autoComplete="tel" value={fields.phone} onChange={e => update("phone", e.target.value)} placeholder="Phone number" /></label></div><label>What can we help you build?<select name="interest" value={fields.interest} onChange={e => update("interest", e.target.value)}><option value="">Select an area (optional)</option><option>Custom Software</option><option>Business Systems</option><option>Mobile & Web</option><option>Technology Support</option><option>AskanPharma</option><option>Something else</option></select></label><label>Message <span aria-hidden="true">*</span><textarea name="message" rows={6} required minLength={10} value={fields.message} onChange={e => update("message", e.target.value)} placeholder="Tell us a little about what you need." /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-green form-button" type="submit">Prepare inquiry <span aria-hidden="true">↗</span></button><p className="form-disclaimer">This form prepares an inquiry draft. It does not send messages; use one of the direct contact options on this page.</p>{ready && <div className="draft-result" role="status"><h2>Your inquiry draft is ready.</h2><p>It has not been sent. Copy and share it with us using one of the contact options on this page.</p><button className="button button-dark" type="button" onClick={copy}>{copied ? "Copied" : "Copy inquiry"}</button><textarea aria-label="Inquiry draft" readOnly value={draft} rows={9} /></div>}</form>;
}
