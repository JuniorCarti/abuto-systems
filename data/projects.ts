export type PortfolioProject = {
  slug: string;
  name: string;
  subtitle?: string;
  category: string;
  description: string;
  status: "Deployed" | "In Development" | "Private Project";
  relationship?: string;
  note?: string;
  href: string;
  ctaLabel: string;
  external?: boolean;
  featured: boolean;
};

export const portfolioProjects = [
  {
    slug: "askanpharma",
    name: "AskanPharma",
    category: "Pharmacy Management System",
    description:
      "A pharmacy management system built to simplify everyday operations, from sales and inventory to customers, reporting and business administration.",
    status: "Deployed",
    relationship: "Abuto Systems product",
    href: "/products/askanpharma",
    ctaLabel: "Explore AskanPharma",
    featured: true,
  },
  {
    slug: "lineage",
    name: "Lineage",
    subtitle: "Family Tree",
    category: "Family & Relationship Platform",
    description:
      "A private, collaborative digital home for family relationships, photographs, important moments and stories across generations. Relatives use their own accounts to build a shared family history.",
    status: "Deployed",
    href: "https://family-tree-a4c4f.web.app/",
    ctaLabel: "Visit Lineage",
    external: true,
    featured: true,
  },
  {
    slug: "zaogrid",
    name: "ZaoGrid",
    category: "Agricultural Technology",
    description:
      "An agricultural coordination platform in development to help smallholder farmers and agricultural organizations make better decisions around production, markets and logistics.",
    status: "In Development",
    note: "Previously developed as AgriSmart.",
    href: "/contact",
    ctaLabel: "Ask about ZaoGrid",
    featured: true,
  },
  {
    slug: "tari-ubc",
    name: "TARI-UBC",
    category: "Business, Tax & Revenue Technology",
    description:
      "A private technology project focused on digital tools for tax, revenue and business compliance workflows.",
    status: "Private Project",
    relationship: "Owned by UBC — Unique Brand Creatives",
    href: "/contact",
    ctaLabel: "Discuss similar work",
    featured: false,
  },
  {
    slug: "gasflow",
    name: "GasFlow",
    category: "Gas Delivery / LPG Business Application",
    description:
      "A mobile application in development for a client, covering gas cylinder sales, refill requests, customer ordering and delivery workflows.",
    status: "In Development",
    relationship: "Client project",
    href: "/contact",
    ctaLabel: "Discuss a similar project",
    featured: false,
  },
] satisfies PortfolioProject[];

export const featuredProjects = portfolioProjects.filter((project) => project.featured);
