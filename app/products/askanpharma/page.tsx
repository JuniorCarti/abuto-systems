import type { Metadata } from "next";
import Link from "next/link";
import { buildWhatsAppUrl, contactDetails, whatsappMessages } from "@/lib/contact";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "AskanPharma",
  description: "AskanPharma is a pharmacy management system by Abuto Systems.",
  alternates: { canonical: `${siteUrl}/products/askanpharma` },
};

export default function AskanPharmaPage() {
  return (
    <main id="main">
      <section className="askan-hero">
        <div className="shell askan-grid">
          <div>
            <Link className="back-link" href="/products">← All products</Link>
            <div className="eyebrow"><span className="eyebrow-line" />A PRODUCT BY ABUTO SYSTEMS</div>
            <h1>Askan<span>Pharma</span><i>.</i></h1>
            <p className="askan-subtitle">Pharmacy Management System</p>
            <p className="askan-intro">Practical software for pharmacy operations.</p>
            <div className="askan-actions"><Link className="button button-green" href="/products/askanpharma/demo">Request a Demo <span aria-hidden="true">↗</span></Link><a className="text-link" href={buildWhatsAppUrl(contactDetails.primaryWhatsApp.number, whatsappMessages.askanPharma)} target="_blank" rel="noopener noreferrer">Ask about AskanPharma on WhatsApp <span aria-hidden="true">↗</span></a></div>
          </div>
          <div className="askan-visual" aria-hidden="true">
            <div className="askan-circle" />
            <div className="askan-tile">
              <span>PHARMACY MANAGEMENT SYSTEM</span>
              <strong>Built for the<br />work behind care.</strong>
              <i />
            </div>
          </div>
        </div>
      </section>
      <section className="section askan-info">
        <div className="shell statement-grid">
          <div className="eyebrow"><span className="eyebrow-line" />THE IDEA</div>
          <div>
            <h2>A clearer way to run the everyday.</h2>
            <p>AskanPharma brings pharmacy work into one focused system. It is developed by Abuto Systems, with its own product identity and a shared belief in useful technology.</p>
            <Link className="text-link" href="/about">About Abuto Systems <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
