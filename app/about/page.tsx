import type { Metadata } from "next";
import Link from "next/link";
import { AboutPersonCard } from "@/components/about-person-card";
import { advisor, approachSteps, capabilities, coreTeam, priorityServiceAreas } from "@/data/about";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "About Abuto Systems | Practical Software Solutions" },
  description:
    "Learn about Abuto Systems, the team behind our software products and client solutions, what we build, how we work, and the businesses we serve across Kenya.",
  alternates: { canonical: `${siteUrl}/about` },
  openGraph: {
    title: "About Abuto Systems | Practical Software Solutions",
    description:
      "Meet the team, learn what Abuto Systems builds, and see how we work with businesses and organizations across Kenya.",
    url: `${siteUrl}/about`,
  },
  twitter: {
    title: "About Abuto Systems | Practical Software Solutions",
    description:
      "Learn about the Abuto Systems team, what we build, how we work, and the businesses we serve across Kenya.",
  },
};

export default function AboutPage() {
  return (
    <main id="main" className="about-page">
      <section className="page-hero about-hero">
        <div className="shell">
          <div className="eyebrow"><span className="eyebrow-line" />ABOUT ABUTO SYSTEMS</div>
          <h1>Practical software.<br /><em>Built around real work.</em></h1>
          <p>Abuto Systems is a software and technology company focused on building practical digital solutions for businesses and organizations.</p>
        </div>
      </section>

      <section className="section about-mission">
        <div className="shell about-mission-grid">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />OUR MISSION</div>
            <h2>Make useful technology easier to access.</h2>
          </div>
          <div className="about-mission-copy">
            <p className="about-mission-statement">Our mission is to make useful technology more accessible to businesses and organizations by building software that is practical, reliable and simple to use.</p>
            <p>We focus on real operational problems rather than technology for its own sake. Our work ranges from our own software products to client solutions, built around how people actually work.</p>
          </div>
        </div>
        <div className="shell about-proof">
          <span className="about-proof-label">IN USE</span>
          <p>AskanPharma is already being used by pharmacies in Eldoret, supporting real day-to-day pharmacy operations.</p>
          <Link className="text-link" href="/products/askanpharma">Explore AskanPharma <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="section about-capabilities">
        <div className="shell">
          <div className="section-top">
            <div className="section-heading">
              <div className="eyebrow"><span className="eyebrow-line" />WHAT WE BUILD</div>
              <h2>Software around real business workflows.</h2>
              <p>From everyday operations to needs that call for a custom system.</p>
            </div>
            <Link className="text-link" href="/products">Explore Our Projects <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="about-capability-grid">
            {capabilities.map((capability) => (
              <article className="about-capability" key={capability.number}>
                <span className="about-step-number">{capability.number}</span>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-team">
        <div className="shell">
          <div className="section-heading about-team-heading">
            <div className="eyebrow"><span className="eyebrow-line" />MEET THE TEAM</div>
            <h2>The people building and supporting Abuto Systems.</h2>
          </div>
          <div className="about-team-grid">
            {coreTeam.map((person) => <AboutPersonCard key={person.name} person={person} />)}
          </div>
          <div className="about-advisor">
            <div className="about-advisor-label">
              <div className="eyebrow"><span className="eyebrow-line" />ADVISOR</div>
              <p>Guidance for the work ahead.</p>
            </div>
            <AboutPersonCard person={advisor} advisor />
          </div>
        </div>
      </section>

      <section className="section about-service">
        <div className="shell about-service-grid">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />WHERE WE SERVE</div>
            <h2>Working with businesses and organizations across Kenya.</h2>
            <p>Our initial priority areas for direct onboarding, deployment, training and support are:</p>
          </div>
          <ul className="about-location-list" aria-label="Initial priority service areas">
            {priorityServiceAreas.map((area) => <li key={area}>{area}</li>)}
          </ul>
        </div>
      </section>

      <section className="section about-approach">
        <div className="shell">
          <div className="section-heading about-approach-heading">
            <div className="eyebrow"><span className="eyebrow-line" />OUR APPROACH</div>
            <h2>From a real problem to a useful solution.</h2>
          </div>
          <ol className="about-approach-grid">
            {approachSteps.map((step) => (
              <li className="about-approach-step" key={step.number}>
                <span className="about-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="simple-cta about-final-cta">
        <div className="shell simple-cta-inner">
          <div>
            <h2>Have a project in mind?</h2>
            <p>Tell us what you are trying to solve, and let’s discuss how technology could make the work simpler.</p>
          </div>
          <Link href="/contact" className="button button-green">Talk to Us <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
