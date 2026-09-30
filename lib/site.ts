import { company } from "@/data/company";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? company.canonicalDomain).replace(/\/+$/, "");
