import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "Abuto Systems — Technology that works for you", template: "%s | Abuto Systems" },
  description: "Abuto Systems builds practical software and digital solutions for businesses and organizations.",
  applicationName: "Abuto Systems",
  openGraph: { type: "website", siteName: "Abuto Systems", title: "Abuto Systems — Technology that works for you", description: "Practical software and digital solutions for businesses and organizations.", ...(siteUrl ? { images: [{ url: "/brand/abuto-social.jpg", width: 1200, height: 630, alt: "Abuto Systems — Building practical digital solutions." }] } : {}) },
  twitter: { card: siteUrl ? "summary_large_image" : "summary", title: "Abuto Systems", description: "Technology that works for you.", ...(siteUrl ? { images: ["/brand/abuto-social.jpg"] } : {}) },
  robots: { index: true, follow: true },
  alternates: siteUrl ? { canonical: siteUrl } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: "Abuto Systems", ...(siteUrl ? { url: siteUrl } : {}) };
  return <html lang="en" className={geist.variable}><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} /><a className="skip-link" href="#main">Skip to content</a><Header />{children}<Footer /></body></html>;
}
