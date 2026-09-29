import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Start a conversation with Abuto Systems about a practical digital solution.", alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/contact` } : undefined };

export default function ContactPage() {
  return <main id="main"><section className="page-hero contact-hero"><div className="shell"><div className="eyebrow"><span className="eyebrow-line" />GET IN TOUCH</div><h1>Let’s build<br /><em>something useful.</em></h1><p>Tell us what you are trying to solve. A real contact channel will be added here before launch.</p></div></section><section className="section contact-section"><div className="shell contact-grid"><div><span className="large-index">01 / YOUR IDEA</span><h2>Start with the problem.</h2><p>Whether it is a new product or a process that needs to work better, a few details help shape the conversation.</p></div><ContactForm /></div></section></main>;
}
