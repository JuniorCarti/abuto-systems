import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { buildWhatsAppUrl, contactDetails, whatsappMessages } from "@/lib/contact";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Abuto Systems by WhatsApp or email about a practical digital solution.",
  alternates: { canonical: `${siteUrl}/contact` },
};

export default function ContactPage() {
  return (
    <main id="main">
      <section className="page-hero contact-hero">
        <div className="shell">
          <div className="eyebrow"><span className="eyebrow-line" />GET IN TOUCH</div>
          <h1>Let’s build<br /><em>something useful.</em></h1>
          <p>Choose a direct contact option or prepare an inquiry below.</p>
        </div>
      </section>
      <section className="section contact-section">
        <div className="shell contact-grid">
          <div>
            <span className="large-index">01 / YOUR IDEA</span>
            <h2>Start with the problem.</h2>
            <p>Whether it is a new product or a process that needs to work better, a few details help shape the conversation.</p>
            <div className="contact-methods" aria-label="Direct contact options">
              <a className="contact-method" href={buildWhatsAppUrl(contactDetails.primaryWhatsApp.number, whatsappMessages.general)} target="_blank" rel="noopener noreferrer">
                <span>WhatsApp</span><strong>{contactDetails.primaryWhatsApp.display}</strong>
              </a>
              <a className="contact-method" href={buildWhatsAppUrl(contactDetails.secondaryWhatsApp.number, whatsappMessages.general)} target="_blank" rel="noopener noreferrer">
                <span>WhatsApp</span><strong>{contactDetails.secondaryWhatsApp.display}</strong>
              </a>
              <a className="contact-method" href={`mailto:${contactDetails.email}?subject=${encodeURIComponent("Abuto Systems Project Enquiry")}`}>
                <span>Email</span><strong>{contactDetails.email}</strong>
              </a>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
