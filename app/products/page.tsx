import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { portfolioProjects } from "@/data/projects";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  title: "Products & Projects",
  description:
    "Explore software products and selected project work in the Abuto Systems portfolio, including AskanPharma, Lineage, ZaoGrid, TARI-UBC and GasFlow.",
  alternates: siteUrl ? { canonical: `${siteUrl}/products` } : undefined,
  openGraph: {
    title: "Products & Projects | Abuto Systems",
    description:
      "Explore software products and selected project work in the Abuto Systems portfolio.",
    url: siteUrl ? `${siteUrl}/products` : undefined,
  },
  twitter: {
    title: "Products & Projects | Abuto Systems",
    description:
      "Explore software products and selected project work in the Abuto Systems portfolio.",
  },
};

export default function ProductsPage() {
  return (
    <main id="main">
      <section className="page-hero">
        <div className="shell">
          <div className="eyebrow"><span className="eyebrow-line" />OUR WORK</div>
          <h1>Products &amp; <em>Projects.</em></h1>
          <p>A selection of software products and project work in the Abuto Systems portfolio.</p>
        </div>
      </section>
      <section className="section portfolio-list-section">
        <div className="shell">
          <h2 className="sr-only">All products and projects</h2>
          <div className="project-grid">
            {portfolioProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}
          </div>
        </div>
      </section>
      <section className="simple-cta">
        <div className="shell simple-cta-inner">
          <div><h2>Have a project in mind?</h2><p>Let’s build something practical.</p></div>
          <Link className="button button-green" href="/contact">Talk to Us <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
