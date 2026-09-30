import { company } from "@/data/company";

export const contactDetails = company.contact;

export const whatsappMessages = {
  general: "Hello Abuto Systems,\n\nI'm interested in your software and digital solutions and would like to discuss a project with your team.\n\nPlease let me know how we can get started.\n\nThank you.",
  askanPharma: "Hello Abuto Systems,\n\nI'm interested in AskanPharma and would like to learn more about the pharmacy management system.\n\nPlease share more information on how I can get started.\n\nThank you.",
  zaoGrid: "Hello Abuto Systems,\n\nI'm interested in learning more about ZaoGrid and its agricultural technology solution.\n\nI would like to discuss the project with your team.\n\nThank you.",
  gasFlow: "Hello Abuto Systems,\n\nI'm interested in learning more about the GasFlow project and the type of mobile solutions you develop for businesses.\n\nI would like to discuss a similar project with your team.\n\nThank you.",
} as const;

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const normalizedNumber = phoneNumber.replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(normalizedNumber)) {
    throw new Error("WhatsApp numbers must use international digits only.");
  }

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
