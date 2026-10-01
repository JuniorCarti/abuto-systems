import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie Policy | Abuto Systems",
  description: "See how Abuto Systems uses cookies and similar technologies on its website, including Cloudflare Turnstile form security.",
  alternates: { canonical: `${siteUrl}/cookies` },
};

const sections: LegalSection[] = [
  { id: "about-cookies", title: "Cookies and browser storage", content: <p>Cookies are small pieces of data a website or service may store in a browser. Websites can also use other browser storage, such as local storage. Browser settings let you review, block, or clear cookies and site data; if you block a technology needed for a feature, that feature may not work.</p> },
  { id: "what-we-use", title: "What this website uses", content: <><p>The application code does not set its own cookies and does not use local storage, session storage, IndexedDB, analytics, advertising pixels, or marketing trackers.</p><p>Contact and demo forms load Cloudflare Turnstile, a third-party security service that performs browser-side checks and supplies a token that the website verifies with Cloudflare. Cloudflare describes Turnstile as processing signals needed to provide its security function. It is used to help prevent automated form submissions.</p><p>The Turnstile integration in this website does not request pre-clearance in code. Cloudflare documents that its optional pre-clearance feature can set a <code>cf_clearance</code> cookie. The widget's dashboard-level configuration is not represented in this repository, so we cannot confirm whether that optional feature is enabled for the live widget. This site has no analytics or advertising cookie categories and does not display an optional cookie consent banner.</p></> },
  { id: "manage", title: "Managing browser settings", content: <p>You can manage or clear cookies and site data through your browser's privacy settings. Blocking third-party scripts or storage may prevent Turnstile from loading and may make website forms unavailable. The rest of the informational pages can still be browsed.</p> },
  { id: "third-parties", title: "Third-party services", content: <p>Turnstile is provided by Cloudflare and is subject to Cloudflare's own service and privacy information. The website also links to external services such as WhatsApp; a link does not load that service as an embedded tracker, but if you follow it the third party may use its own technologies and policies. See our <a href={`${siteUrl}/privacy`}>Privacy Policy</a>.</p> },
  { id: "updates-contact", title: "Updates and contact", content: <><p>We will update this policy if the website's use of cookies or similar technologies changes. The updated date appears at the top of this page.</p><p>Questions can be sent to <a href="mailto:abutosystems@gmail.com">abutosystems@gmail.com</a>.</p></> },
];

export default function CookiesPage() {
  return <LegalPage eyebrow="COOKIES & STORAGE" title="Cookie Policy" summary="A description of the browser technologies used on this site and how you can manage them." sections={sections} />;
}
