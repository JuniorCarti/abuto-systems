export const navigation = [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/solutions" },
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const solutions = [
  { number: "01", title: "Custom Software", short: "Built around your business.", description: "Software shaped around the way your team works, for organizations whose needs do not fit an off-the-shelf tool." },
  { number: "02", title: "Business Systems", short: "Simplify everyday operations.", description: "Connected tools that bring routine work into clearer processes, for teams managing growing day-to-day demands." },
  { number: "03", title: "Mobile & Web", short: "Modern digital experiences.", description: "Useful applications and websites that make services easier to access, for businesses ready to serve people digitally." },
  { number: "04", title: "Technology Support", short: "Reliable systems. Reliable support.", description: "Practical help for the technology an organization depends on, for teams that need their systems to keep working." },
] as const;

export const products = [
  { name: "AskanPharma", category: "Pharmacy Management System", description: "Smarter pharmacy operations.", href: "/products/askanpharma" },
] as const;
