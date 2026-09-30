import Link from "next/link";
import Image from "next/image";
import type { PortfolioProject } from "@/data/projects";
import { buildWhatsAppUrl, contactDetails } from "@/lib/contact";

export function ProjectCard({ project }: { project: PortfolioProject }) {
  const linkContent = <>{project.ctaLabel}<span aria-hidden="true">↗</span></>;
  const href = project.whatsappMessage
    ? buildWhatsAppUrl(contactDetails.primaryWhatsApp.number, project.whatsappMessage)
    : project.href;

  return (
    <article className={`project-card project-card--${project.slug}`} data-project={project.slug}>
      <div className={`project-card-art${project.image ? " project-card-art--image" : ""}`}>
        {project.image ? (
          <Image
            className={`project-card-image${project.image.fit === "contain" ? " project-card-image--contain" : ""}`}
            src={project.image.src}
            alt={project.image.alt}
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 980px) 50vw, 33vw"
            draggable={false}
          />
        ) : (
          <div className="project-card-wordmark" aria-hidden="true">
            <span>AskanPharma</span>
            <small>by Abuto Systems</small>
          </div>
        )}
      </div>
      <div className="project-card-body">
        <div className="project-card-statuses">
          <span className={`project-status project-status--${project.status.toLowerCase().replace(" ", "-")}`}>
            {project.status}
          </span>
        </div>
        <p className="project-category">{project.category}</p>
        <h3>
          {project.name}
          {project.subtitle && <span className="project-subtitle">{project.subtitle}</span>}
        </h3>
        <p className="project-description">{project.description}</p>
        {project.note && <p className="project-note">{project.note}</p>}
        {project.relationship && <p className="project-relationship">{project.relationship}</p>}
        <div className="project-card-action">
          {project.external || project.whatsappMessage ? (
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${project.ctaLabel}${project.whatsappMessage ? " on WhatsApp" : ""} (opens in a new tab)`}>
              {linkContent}
            </a>
          ) : (
            <Link href={href}>{linkContent}</Link>
          )}
          {project.slug === "askanpharma" && <Link className="project-demo-link" href="/products/askanpharma/demo">Request a Demo <span aria-hidden="true">↗</span></Link>}
        </div>
      </div>
    </article>
  );
}
