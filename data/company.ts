export const company = {
  name: "Abuto Systems",
  tagline: "Technology that works for you.",
  timezone: "Africa/Nairobi",
  timezoneLabel: "East Africa Time (EAT · UTC+3)",
  canonicalDomain: "https://abutosystems.com",
  positioning: "Virtual-first technology services",
  contact: {
    primaryWhatsApp: { display: "+254 113 245 740", number: "254113245740" },
    secondaryWhatsApp: { display: "+254 101 291 262", number: "254101291262" },
    email: "abutosystems@gmail.com",
  },
  businessHours: {
    weekdays: { opens: "08:00", closes: "18:00" },
    saturday: { opens: "09:00", closes: "16:00" },
    sunday: null,
  },
} as const;

export const businessHoursDisplay = [
  { days: "Monday–Friday", hours: "8:00 AM–6:00 PM" },
  { days: "Saturday", hours: "9:00 AM–4:00 PM" },
  { days: "Sunday", hours: "Closed" },
] as const;
