import { businessHoursDisplay, company } from "@/data/company";

export function VirtualHours({ compact = false, idPrefix = compact ? "compact-hours" : "virtual-hours" }: { compact?: boolean; idPrefix?: string }) {
  const headingId = `${idPrefix}-title`;
  return <section className={`virtual-hours${compact ? " virtual-hours--compact" : ""}`} aria-labelledby={headingId}>
    <div className="virtual-hours-heading"><span className="eyebrow"><span className="eyebrow-line" />VIRTUAL-FIRST TECHNOLOGY SERVICES</span><h2 id={headingId}>Virtual hours</h2><p>Services and consultations are available virtually.</p></div>
    <dl className="virtual-hours-list">{businessHoursDisplay.map(item => <div key={item.days}><dt>{item.days}</dt><dd>{item.hours}</dd></div>)}</dl>
    <p className="virtual-hours-zone">{company.timezoneLabel}</p>
  </section>;
}
