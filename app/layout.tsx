import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { siteUrl } from "@/lib/site";
import { company } from "@/data/company";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Abuto Systems — Technology that works for you", template: "%s | Abuto Systems" },
  description: "Abuto Systems builds practical software and digital solutions for businesses and organizations.",
  applicationName: "Abuto Systems",
  openGraph: { type: "website", siteName: "Abuto Systems", title: "Abuto Systems — Technology that works for you", description: "Practical software and digital solutions for businesses and organizations.", images: [{ url: "/brand/abuto-social.jpg", width: 1200, height: 630, alt: "Abuto Systems — Building practical digital solutions." }] },
  twitter: { card: "summary_large_image", title: "Abuto Systems", description: "Technology that works for you.", images: ["/brand/abuto-social.jpg"] },
  robots: { index: true, follow: true },
  alternates: { canonical: `${siteUrl}/` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: company.name, email: company.contact.email, url: siteUrl };
  return <html lang="en" className={geist.variable}><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} /><a className="skip-link" href="#main">Skip to content</a><Header />{children}<Footer /></body></html>;
}
