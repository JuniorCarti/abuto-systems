import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return [];
  return ["", "/solutions", "/products", "/products/askanpharma", "/about", "/contact"].map(path => ({ url: `${base.replace(/\/$/, "")}${path}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: path === "" ? 1 : 0.7 }));
}
