import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { VirtualHours } from "@/components/virtual-hours";
import Link from "next/link";
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
          <p>Tell us what you’re working on and we’ll help you explore the right solution. We work virtually with businesses and teams.</p>
        </div>
      </section>
      <section className="section contact-section">
        <div className="shell contact-grid">
          <div>
            <span className="large-index">01 / GENERAL ENQUIRY</span>
            <h2>Start with the problem.</h2>
            <p>Share a little about the work you want to improve, or ask about a virtual consultation with our team.</p>
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
      <section className="section contact-follow-up">
        <div className="shell contact-follow-up-grid">
          <VirtualHours idPrefix="contact-hours" />
          <div className="contact-pathways">
            <span className="eyebrow"><span className="eyebrow-line" />NEXT STEPS</span>
            <h2>Choose the right conversation.</h2>
            <Link className="contact-pathway" href="/products/askanpharma/demo"><strong>Request an AskanPharma demo</strong><span>Arrange a virtual product walkthrough →</span></Link>
            <Link className="contact-pathway" href="/contact#enquiry-form"><strong>Virtual consultation</strong><span>Choose Virtual Consultation in the enquiry form →</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
