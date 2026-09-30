import type { Metadata } from "next";
import Link from "next/link";
import { solutions } from "@/data/site";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Solutions", description: "Custom software, business systems, mobile and web experiences, and technology support from Abuto Systems.", alternates: { canonical: `${siteUrl}/solutions` } };

export default function SolutionsPage() {
  return <main id="main"><section className="page-hero"><div className="shell"><div className="eyebrow"><span className="eyebrow-line" />WHAT WE DO</div><h1>Technology for<br /><em>real work.</em></h1><p>Four ways we help organizations move forward with useful digital solutions.</p></div></section><section className="section"><div className="shell detail-list">{solutions.map(s => <article className="detail-row" key={s.number}><span className="detail-number">{s.number} / 04</span><div><h2>{s.title}</h2><p className="detail-short">{s.short}</p></div><p className="detail-description">{s.description}</p></article>)}</div></section><section className="simple-cta"><div className="shell simple-cta-inner"><div><h2>Let’s solve the right problem.</h2><p>Tell us what you are working through.</p></div><Link href="/contact" className="button button-green">Talk to Us <span aria-hidden="true">↗</span></Link></div></section></main>;
}
