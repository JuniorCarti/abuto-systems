import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalPage({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <main id="main" className="legal-page">
      <header className="page-hero legal-hero">
        <div className="shell">
          <div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div>
          <h1>{title}</h1>
          <p className="legal-summary">{summary}</p>
          <p className="legal-updated">Last updated: 1 October 2026</p>
        </div>
      </header>
      <div className="shell legal-content">
        <nav className="legal-toc" aria-label="On this page">
          <h2>On this page</h2>
          <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
        </nav>
        <div className="legal-sections">
          {sections.map(section => (
            <section className="legal-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`}>{section.title}</h2>
              <div className="legal-prose">{section.content}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
