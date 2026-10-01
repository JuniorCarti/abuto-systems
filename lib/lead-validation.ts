import { validateDemoSlot } from "./business-hours.ts";

const contactMethods = new Set(["Email", "Phone", "WhatsApp"]);
const interests = new Set(["General Enquiry", "Virtual Consultation", "Custom Software", "Business Systems", "Mobile Applications", "Web Applications", "Enterprise Systems", "Technology Solutions", "AskanPharma", "Something else"]);

export type LeadPayload = Record<string, unknown> & { kind?: unknown; website?: unknown; turnstileToken?: unknown };
export type ValidatedLead = {
  kind: "inquiry" | "demo";
  name: string;
  organization: string;
  email: string;
  phone: string;
  town: string;
  interest: string;
  preferredDate: string;
  preferredTime: string;
  branches: number | null;
  preferredContact: string;
  message: string;
};
export type LeadValidation = { valid: true; lead: ValidatedLead } | { valid: false; errors: Record<string, string> };

function value(payload: LeadPayload, key: string, max: number, required = false) {
  const raw = payload[key];
  if (raw === undefined || raw === null || raw === "") return required ? { value: "", error: "This field is required." } : { value: "" };
  if (typeof raw !== "string") return { value: "", error: "Use text for this field." };
  const normalized = raw.trim();
  if (required && !normalized) return { value: "", error: "This field is required." };
  if (normalized.length > max) return { value: "", error: `Use ${max} characters or fewer.` };
  return { value: normalized };
}

export function validateLead(payload: LeadPayload, now = new Date()): LeadValidation {
  const errors: Record<string, string> = {};
  const isTrial = payload.kind === "trial";
  const kind = payload.kind === "demo" ? "demo" : payload.kind === "inquiry" || isTrial ? "inquiry" : null;
  if (!kind) errors.kind = "Unsupported request type.";

  const name = value(payload, "name", 120, true);
  const organization = value(payload, "organization", 160, kind === "demo" || isTrial);
  const email = value(payload, "email", 254, true);
  const phone = value(payload, "phone", 40, kind === "demo");
  const town = value(payload, "town", 120);
  const interest = isTrial ? { value: "AskanPharma trial request" } : value(payload, "interest", 40);
  const preferredContact = value(payload, "preferredContact", 20);
  const message = value(payload, "message", 2000, kind === "inquiry" && !isTrial);
  for (const [key, result] of Object.entries({ name, organization, email, phone, town, interest, preferredContact, message })) {
    if (result.error) errors[key] = result.error;
  }
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = "Enter a valid email address.";
  if (!isTrial && !errors.interest && interest.value && !interests.has(interest.value)) errors.interest = "Choose a supported enquiry type.";
  if (!errors.preferredContact && preferredContact.value && !contactMethods.has(preferredContact.value)) errors.preferredContact = "Choose Email, Phone, or WhatsApp.";

  const preferredDate = kind === "demo" ? value(payload, "preferredDate", 10, true) : { value: "" };
  const preferredTime = kind === "demo" ? value(payload, "preferredTime", 5, true) : { value: "" };
  if (preferredDate.error) errors.preferredDate = preferredDate.error;
  if (preferredTime.error) errors.preferredTime = preferredTime.error;
  if (kind === "demo" && !preferredDate.error && !preferredTime.error) {
    const slot = validateDemoSlot(preferredDate.value, preferredTime.value, now);
    if (!slot.valid) errors.preferredDate = slot.reason;
  }

  let branches: number | null = null;
  if (kind === "demo" && payload.branches !== "" && payload.branches !== undefined && payload.branches !== null) {
    const parsed = Number(payload.branches);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) errors.branches = "Enter a branch count from 1 to 10,000.";
    else branches = parsed;
  }
  if (payload.website !== undefined && typeof payload.website !== "string") errors.website = "Invalid request.";

  if (Object.keys(errors).length || !kind) return { valid: false, errors };
  return { valid: true, lead: {
    kind,
    name: name.value,
    organization: organization.value,
    email: email.value.toLowerCase(),
    phone: phone.value,
    town: town.value,
    interest: interest.value,
    preferredDate: preferredDate.value,
    preferredTime: preferredTime.value,
    branches,
    preferredContact: preferredContact.value,
    message: message.value || (isTrial ? "21-day AskanPharma trial setup request." : ""),
  } };
}
