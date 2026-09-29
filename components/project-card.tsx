import Link from "next/link";
import type { PortfolioProject } from "@/data/projects";

export function ProjectCard({ project }: { project: PortfolioProject }) {
  const linkContent = <>{project.ctaLabel}<span aria-hidden="true">↗</span></>;

  return (
    <article className={`project-card project-card--${project.slug}`} data-project={project.slug}>
      <div className="project-card-art" aria-hidden="true">
        <span className="project-art-orbit" />
        <span className="project-art-shape" />
        <span className="project-art-line" />
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
          {project.external ? (
            <a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.ctaLabel} (opens in a new tab)`}>
              {linkContent}
            </a>
          ) : (
            <Link href={project.href}>{linkContent}</Link>
          )}
        </div>
      </div>
    </article>
  );
}
