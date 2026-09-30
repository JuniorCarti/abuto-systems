import type { ValidatedLead } from "@/lib/lead-validation";

export const leadNotificationDestination = "abutosystems@gmail.com";
export const leadNotificationSender = "notifications@abutosystems.com";

type EmailBinding = {
  send(message: {
    to: string;
    from: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

type StoredLead = ValidatedLead & {
  id: string;
  createdAt: string;
};

type LeadsDatabase = {
  prepare(query: string): {
    bind(...values: Array<string | number | null>): { run(): Promise<{ success: boolean }> };
  };
};

function safeBodyText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/ {2,}/g, " ").trim();
}

function field(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return [];
  return [`${label}: ${safeBodyText(String(value))}`];
}

export function buildLeadNotification(lead: StoredLead) {
  const isDemo = lead.kind === "demo";
  const subject = isDemo ? "New AskanPharma Demo Request" :
    lead.interest === "Virtual Consultation" ? "New Virtual Consultation Request" : "New General Enquiry";
  const lines = [
    subject,
    "",
    ...field("Reference", lead.id),
    ...field("Full name", lead.name),
    ...field(isDemo ? "Pharmacy / Business" : "Business / Organization", lead.organization),
    ...field("Email", lead.email),
    ...field("Phone", lead.phone),
    ...field("Town / Location", lead.town),
    ...field("Enquiry type", lead.interest),
    ...field("Preferred contact", lead.preferredContact),
    ...field("Number of branches", lead.branches),
    ...field("Preferred demo date", lead.preferredDate),
    ...field("Preferred demo time (EAT / UTC+3)", lead.preferredTime),
    ...field("Submitted", lead.createdAt),
  ];

  if (lead.message) {
    lines.push("", "Message:", safeBodyText(lead.message));
  }
  if (isDemo) {
    lines.push("", "The preferred demo date and time are a request and have not yet been confirmed.");
  }

  return { to: leadNotificationDestination, from: leadNotificationSender, subject, text: lines.join("\n") };
}

export async function sendLeadNotification(binding: EmailBinding | undefined, lead: StoredLead) {
  if (!binding) throw new Error("Lead notification binding is not configured");
  return binding.send(buildLeadNotification(lead));
}

export async function storeLeadAndNotify(
  database: LeadsDatabase,
  binding: EmailBinding | undefined,
  lead: ValidatedLead,
) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const result = await database.prepare(`
    INSERT INTO leads (
      id, kind, name, organization, email, phone, town, interest,
      preferred_date, preferred_time, branches, preferred_contact, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, lead.kind, lead.name, lead.organization, lead.email, lead.phone,
    lead.town, lead.interest, lead.preferredDate || null, lead.preferredTime || null,
    lead.branches, lead.preferredContact, lead.message, createdAt,
  ).run();
  if (!result.success) return false;

  try {
    await sendLeadNotification(binding, { ...lead, id, createdAt });
  } catch {
    console.error("Lead notification delivery failed after the lead was stored.");
  }
  return true;
}
