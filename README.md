# Abuto Systems

The corporate website for Abuto Systems, a company developing practical software and digital solutions for businesses and organizations. AskanPharma is presented as a separate product by Abuto Systems.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS 4, and CSS design tokens. Geist is loaded with `next/font`. The site uses server components except for the mobile navigation and contact form.

## Structure

- `app/`: route pages, metadata routes, favicon, and global styles
- `components/`: shared navigation, footer, project card, headings, and contact form
- `data/site.ts`: navigation, solution areas, and Abuto Systems product entries
- `data/projects.ts`: portfolio copy, status, ownership/client relationship, and destinations
- `lib/contact.ts`: approved contact details and URL-encoded WhatsApp messages
- `assets/images/`: source project imagery, kept outside the public asset directory
- `public/projects/`: optimized WebP card imagery served by the portfolio
- `assets/images/logo.png`: untouched master Abuto Systems logo
- `public/brand/`: optimized website logo variants

The `products` array in `data/site.ts` lists Abuto Systems products used by the footer. `portfolioProjects` in `data/projects.ts` drives the homepage preview and Products & Projects page. Keep each project's status and relationship accurate. When adding a product, update both arrays and create its detail route; add client or private projects to `portfolioProjects` only. Only add approved public destinations. Lineage opens its supplied URL in a new tab. Project card images are optimized WebP derivatives; source images remain in `assets/images/`. The available AskanPharma image was not supplied, so its card uses a typographic treatment pending approved artwork. ZaoGrid temporarily uses the Abuto Systems logo.

## Local development

Requires Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the confirmed production origin when one exists. The variable is optional for local work. Without it, the sitemap has no absolute entries and metadata omits the base URL. Never commit `.env.local`.

## Scripts and validation

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run test:e2e
```

`npm test` starts the production build on a temporary local port and checks all six routes plus the 404 page. Run it after `npm run build`.
`npm run test:e2e` uses installed Microsoft Edge through Playwright to verify navigation, portfolio statuses and ownership, supplied project images, WhatsApp/email links, the contact draft, responsive widths, and automated WCAG 2.2 A/AA checks. Install Playwright’s browser or have Edge installed before running it on another machine.

The current Next.js ESLint preset includes a React plugin that still calls an API removed in ESLint 10. The project uses current ESLint 10 and disables only that plugin’s legacy `react/*` rules; Next.js, React Hooks, TypeScript, and JSX accessibility rules remain active.

The contact form validates an inquiry and offers a copyable draft. It **does not send messages**. Visitors can contact Abuto Systems directly at the approved WhatsApp numbers or email shown on the Contact page and footer. Before adding automated form delivery, choose a provider, add server side validation and abuse protection, and keep provider credentials out of client code.

## Deployment

Import the repository into Vercel, set `NEXT_PUBLIC_SITE_URL` to the confirmed HTTPS origin, and run the production build. Direct WhatsApp and email contact links are ready; the inquiry form remains a local draft and does not send submissions. No production domain or deployment account is assumed here.

## Brand and content

Blue and green are centralized in `app/globals.css`. The supplied Abuto Systems logo is the corporate identity. Keep `assets/images/logo.png` as the untouched master. The header uses a tightly cropped transparent mark with the Abuto Systems wordmark; the footer uses the full logo on a light surface so its dark lettering remains legible. `public/brand/abuto-symbol.png` and `public/brand/abuto-logo-full.png` are optimized from that source, `public/brand/abuto-social.jpg` is a 1200×630 Open Graph/X preview included in page metadata when `NEXT_PUBLIC_SITE_URL` is set, and `app/icon.png` uses the standalone mark for browser identity. The social image metadata is omitted until the production origin is known, avoiding localhost URLs in share cards. Preserve the brand colors when preparing future variants. The AskanPharma page uses its separate blue and green product treatment; a production-ready transparent AskanPharma logo asset has not been supplied. Current product wording stays intentionally high level. Add verified copy and a licensed product logo under `public/products/askanpharma/` once provided.

## Security and SEO

No secrets or external integrations are required for the current site. Keep environment files out of Git, review dependencies regularly, and use server side checks for any future form endpoint. Page metadata, robots, and a conditional sitemap are implemented. Set the confirmed site URL before deployment so canonical and social URLs can be completed accurately.
