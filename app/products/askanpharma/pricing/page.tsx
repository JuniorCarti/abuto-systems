import type { Metadata } from "next";
import Link from "next/link";
import { AskanPharmaPricingCalculator } from "@/components/askanpharma-pricing-calculator";
import { LeadForm } from "@/components/lead-form";
import { calculateAskanPharmaPricing, formatKes } from "@/lib/askanpharma-pricing";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "AskanPharma Pricing",
  description: "Explore AskanPharma pricing, including a 21-day free trial, monthly and annual subscriptions, device pricing, onboarding and support.",
  alternates: { canonical: `${siteUrl}/products/askanpharma/pricing` },
};

const deviceExamples = [1, 2, 3, 4, 5].map(devices => calculateAskanPharmaPricing(devices)!);

export default function AskanPharmaPricingPage() {
  return <main id="main" className="pricing-page">
    <section className="pricing-hero">
      <div className="shell pricing-hero-grid">
        <div className="pricing-hero-copy">
          <Link className="back-link" href="/products/askanpharma">← AskanPharma</Link>
          <div className="eyebrow pricing-hero-eyebrow"><span className="eyebrow-line" />CLEAR PRICING. ONE COMPLETE SYSTEM.</div>
          <h1>AskanPharma pricing.<br /><em>Made simple.</em></h1>
          <p>Try AskanPharma free for 21 days, then choose monthly or annual billing.</p>
          <div className="pricing-hero-actions">
            <Link className="button button-green" href="#trial-request">Start 21-Day Free Trial <span aria-hidden="true">↓</span></Link>
            <Link className="button button-outline-light" href="/products/askanpharma/demo">Request a Demo <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="pricing-hero-note">One pharmacy system. No feature tiers. Add devices as you grow.</p>
        </div>
        <aside className="pricing-hero-card" aria-label="Pricing overview">
          <span className="pricing-card-label">START WITH</span>
          <strong>21<span>days</span></strong>
          <p>Free trial with setup help. One-time setup pricing applies above 3 devices.</p>
          <div className="pricing-card-rule" />
          <span className="pricing-card-label">THEN FROM</span>
          <strong className="pricing-card-price">KES 1,500<small>/month</small></strong>
          <p>One device. One complete system.</p>
        </aside>
      </div>
    </section>

    <section className="section pricing-plans" aria-labelledby="pricing-plans-title">
      <div className="shell">
        <div className="pricing-section-heading">
          <span className="eyebrow"><span className="eyebrow-line" />STRAIGHTFORWARD SUBSCRIPTIONS</span>
          <h2 id="pricing-plans-title">One system. Choose your billing.</h2>
          <p>Both plans include the complete AskanPharma system on one device.</p>
        </div>
        <div className="pricing-plan-grid">
          <article className="pricing-plan-card">
            <span className="pricing-plan-name">MONTHLY</span>
            <h3>{formatKes(1_500)}<small>/month</small></h3>
            <p className="pricing-plan-lead">First device included</p>
            <ul><li>One complete AskanPharma system</li><li>Additional devices: KES 500/month each</li><li>Updates and bug fixes with an active subscription</li></ul>
            <Link className="text-link" href="#trial-request">Try it free for 21 days <span aria-hidden="true">↓</span></Link>
          </article>
          <article className="pricing-plan-card pricing-plan-featured">
            <span className="pricing-value-badge">BETTER ANNUAL VALUE</span>
            <span className="pricing-plan-name">ANNUAL</span>
            <h3>{formatKes(15_000)}<small>/year</small></h3>
            <p className="pricing-plan-lead">First device included</p>
            <ul><li>One complete AskanPharma system</li><li>Additional devices: KES 5,000/year each</li><li>Save KES 3,000/year on one device</li><li>Updates and bug fixes with an active subscription</li></ul>
            <p className="pricing-equivalent">About 2 months’ cost compared with monthly billing.</p>
            <Link className="button button-dark" href="#trial-request">Try it free for 21 days <span aria-hidden="true">↓</span></Link>
          </article>
        </div>
        <p className="pricing-plan-footnote">The 21-day trial is for evaluation. After the trial, you may choose a monthly or annual subscription. Submitting a trial request does not start the trial automatically.</p>
      </div>
    </section>

    <section className="section pricing-devices" aria-labelledby="device-pricing-title">
      <div className="shell pricing-device-layout">
        <div className="pricing-device-intro">
          <span className="eyebrow"><span className="eyebrow-line" />GROW AT YOUR PACE</span>
          <h2 id="device-pricing-title">Add devices.<br /><em>Keep one system.</em></h2>
          <p>The first device sets your base subscription. Each additional device has a clear per-device rate.</p>
        </div>
        <div className="pricing-device-details">
          <AskanPharmaPricingCalculator />
          <div className="pricing-examples">
            <h3>Example subscription totals</h3>
            <div className="pricing-table-wrap">
              <table>
                <caption>Monthly and annual AskanPharma subscription totals by device count</caption>
                <thead><tr><th scope="col">Devices</th><th scope="col">Monthly</th><th scope="col">Annual</th></tr></thead>
                <tbody>{deviceExamples.map(example => <tr key={example.devices}><th scope="row">{example.devices}</th><td>{formatKes(example.monthlyTotal)}/mo</td><td>{formatKes(example.annualTotal)}/yr</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="section pricing-included" aria-labelledby="included-title">
      <div className="shell">
        <div className="pricing-section-heading">
          <span className="eyebrow"><span className="eyebrow-line" />ONE COMPLETE SYSTEM</span>
          <h2 id="included-title">The essentials, clearly covered.</h2>
        </div>
        <div className="pricing-included-grid">
          <article><span aria-hidden="true">01</span><h3>Full AskanPharma system</h3><p>One complete pharmacy management system. No Basic, Pro or feature tiers.</p></article>
          <article><span aria-hidden="true">02</span><h3>Setup &amp; onboarding</h3><p>Free for up to 3 devices. Above three, KES 500 one-time for each additional device.</p></article>
          <article><span aria-hidden="true">03</span><h3>Updates &amp; bug fixes</h3><p>Included while your subscription is active.</p></article>
          <article><span aria-hidden="true">04</span><h3>Optional premium support</h3><p>First 2 months free after you become a paying subscriber, then KES 500/month if you choose this support.</p></article>
        </div>
      </div>
    </section>

    <section className="section pricing-setup-support">
      <div className="shell pricing-service-grid">
        <article className="pricing-service-card pricing-service-green">
          <span className="eyebrow"><span className="eyebrow-line" />GETTING STARTED</span>
          <h2>Setup &amp; onboarding</h2>
          <p className="pricing-service-price">FREE <small>for up to 3 devices</small></p>
          <p>For each device above three: <strong>KES 500 one-time.</strong></p>
        </article>
        <article className="pricing-service-card">
          <span className="eyebrow"><span className="eyebrow-line" />OPTIONAL HELP</span>
          <h2>Premium support</h2>
          <p>First 2 months free after you become a paying subscriber. Then <strong>KES 500/month</strong>, if you choose premium support.</p>
          <p>Help with product use, staff guidance, configuration questions and operational troubleshooting.</p>
          <p className="pricing-maintenance-note"><strong>Software updates and bug fixes are already included</strong> with an active subscription.</p>
        </article>
      </div>
    </section>

    <section className="pricing-demo-cta">
      <div className="shell pricing-demo-inner">
        <div><span className="eyebrow"><span className="eyebrow-line" />SEE THE COMPLETE SYSTEM</span><h2>Have a larger setup in mind?</h2><p>Let’s talk through your devices and pharmacy workflow in a free 30-minute virtual demo.</p></div>
        <Link className="button button-green" href="/products/askanpharma/demo">Request a Free Demo <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section id="trial-request" className="section pricing-trial-request" aria-labelledby="trial-request-title">
      <div className="shell pricing-trial-grid">
        <div className="pricing-trial-copy">
          <span className="eyebrow"><span className="eyebrow-line" />21 DAYS TO EXPLORE</span>
          <h2 id="trial-request-title">Try AskanPharma free for 21 days.</h2>
          <p>Send a trial request and we’ll contact you to help set up your evaluation.</p>
          <p className="pricing-trial-note">Your trial does not start automatically when you submit this form. We’ll confirm the setup with you. After the trial, you may choose monthly or annual billing.</p>
        </div>
        <LeadForm kind="trial" />
      </div>
    </section>
  </main>;
}
