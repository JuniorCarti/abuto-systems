import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/solutions", "/products", "/products/askanpharma", "/about", "/contact"].map(path => ({ url: `${siteUrl}${path}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: path === "/" ? 1 : 0.7 }));
}
