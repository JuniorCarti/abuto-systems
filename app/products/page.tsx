import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = { title: "Products", description: "Explore products built by Abuto Systems, including AskanPharma for pharmacy management.", alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/products` } : undefined };

export default function ProductsPage() {
  return <main id="main"><section className="page-hero"><div className="shell"><div className="eyebrow"><span className="eyebrow-line" />OUR PRODUCTS</div><h1>Ideas made <em>useful.</em></h1><p>Focused products built by Abuto Systems for specific, real-world needs.</p></div></section><section className="section product-list-section"><div className="shell"><ProductCard /></div></section></main>;
}
