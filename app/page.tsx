import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { featuredProjects } from "@/data/projects";
import { solutions } from "@/data/site";

export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow"><span className="eyebrow-line" />SOFTWARE WITH PURPOSE</div>
            <h1>Technology<br />that works <em>for you.</em></h1>
            <p>Practical digital solutions built for real businesses and organizations.</p>
            <div className="hero-actions">
              <Link className="button button-green" href="/solutions">Explore Solutions <span aria-hidden="true">↗</span></Link>
              <Link className="button button-outline-light" href="/contact">Talk to Us</Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-grid-lines" />
            <div className="hero-ring hero-ring-outer" />
            <div className="hero-ring hero-ring-inner" />
            <div className="hero-shape"><span /></div>
            <div className="hero-visual-label"><i /> BUILT TO BE USEFUL</div>
          </div>
        </div>
        <div className="shell hero-bottom"><span>ABUTO SYSTEMS / 01</span><span>Independent thinking. Practical technology.</span></div>
      </section>

      <section className="statement section">
        <div className="shell statement-grid">
          <div className="eyebrow"><span className="eyebrow-line" />WHAT WE BELIEVE</div>
          <div><h2>We build technology around <span>real problems.</span></h2><p>Software designed to make work simpler, clearer and more useful.</p></div>
        </div>
      </section>

      <section className="section solutions-section">
        <div className="shell">
          <div className="section-top">
            <SectionHeading eyebrow="WHAT WE DO" title="Solutions for work that matters." description="Thoughtful technology, shaped around the people who use it." />
            <Link className="text-link" href="/solutions">Explore solutions <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="solution-grid">
            {solutions.map((solution) => (
              <Link href="/solutions" className="solution-card" key={solution.number}>
                <span className="solution-number">{solution.number} / 04</span>
                <span className="solution-icon" aria-hidden="true">{solution.number === "01" ? "◧" : solution.number === "02" ? "▦" : solution.number === "03" ? "◇" : "✳"}</span>
                <h3>{solution.title}</h3><p>{solution.short}</p><span className="solution-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section portfolio-preview">
        <div className="shell">
          <div className="section-top">
            <SectionHeading eyebrow="OUR WORK" title="Products & Projects" description="A selection of software products and project work in the Abuto Systems portfolio." />
            <Link className="text-link" href="/products">View All Projects <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="project-grid project-grid--featured">
            {featuredProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}
          </div>
        </div>
      </section>

      <section className="section about-teaser">
        <div className="shell about-teaser-grid">
          <div className="about-graphic" aria-hidden="true"><span>ABUTO</span><span>SYSTEMS</span><i /></div>
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />ABOUT US</div>
            <h2>Useful by design.<br /><span>Practical by nature.</span></h2>
            <p>Technology should solve problems, not create more of them. We build digital solutions with simplicity and reliability in mind.</p>
            <Link className="text-link" href="/about">Get to know us <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="shell cta-inner">
          <div><div className="eyebrow"><span className="eyebrow-line" />LET’S WORK TOGETHER</div><h2>Have a problem technology could solve?</h2><p>Let’s build something useful.</p></div>
          <Link className="button button-green" href="/contact">Talk to Abuto Systems <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
