import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/lead-form";
import { VirtualHours } from "@/components/virtual-hours";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request an AskanPharma Demo",
  description: "Request a virtual demonstration of AskanPharma, the pharmacy management system by Abuto Systems.",
  alternates: { canonical: `${siteUrl}/products/askanpharma/demo` },
};

export default function AskanPharmaDemoPage() {
  return <main id="main">
    <section className="page-hero demo-hero"><div className="shell">
      <Link className="back-link" href="/products/askanpharma">← AskanPharma</Link>
      <div className="eyebrow"><span className="eyebrow-line" />A PRODUCT BY ABUTO SYSTEMS</div>
      <h1>Request an<br /><em>AskanPharma demo.</em></h1>
      <p>Tell us a little about your pharmacy and we’ll arrange a virtual demonstration of the pharmacy management system.</p>
    </div></section>
    <section className="section demo-form-section"><div className="shell demo-form-grid">
      <div className="demo-form-aside"><span className="large-index">VIRTUAL PRODUCT WALKTHROUGH</span><h2>See how it could support your pharmacy operations.</h2><p>Share your preferred date and time. We’ll check availability and contact you to confirm the next steps. Your request does not reserve a time.</p><VirtualHours compact idPrefix="demo-hours" /></div>
      <LeadForm kind="demo" />
    </div></section>
  </main>;
}
