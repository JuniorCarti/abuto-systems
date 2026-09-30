# Abuto Systems

Corporate website for Abuto Systems, with AskanPharma presented as a separate product. The public site uses the confirmed domain `https://abutosystems.com`.

## Stack and architecture

- Next.js App Router 16.3.7, React 19.2.8, and strict TypeScript
- vinext 1.0.0 with Vite 8.3.1 and Cloudflare's Vite plugin 1.62.2
- Cloudflare Workers runtime, Wrangler 4.144.0, Tailwind CSS 4, and Geist
- Server-rendered routes and React Server Component navigation run in the Worker; `dist/client` contains browser assets
- Site content is organized in reusable data modules. No database or CMS is required.

Cloudflare's current Next.js guide recommends vinext for new Workers deployments and labels the project beta. The app passed `vinext check` with 96% compatibility and no reported unsupported APIs. Review Cloudflare's compatibility guidance before upgrading. See [the deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md).

## Directory structure

- `app/`: route pages, metadata routes, favicon, and global styles
- `components/`: shared navigation, footer, forms, cards, and page sections
- `data/`: reusable solutions, products, and portfolio content
- `lib/`: approved contact links, site origin, and shared utilities
- `public/brand/`, `public/projects/`: brand and portfolio assets
- `tests/`, `e2e/`: Worker HTTP checks and browser coverage
- `wrangler.jsonc`, `vite.config.ts`: Cloudflare Worker and Vite configuration
- `docs/CLOUDFLARE_DEPLOYMENT.md`: preview, domain, release, and rollback procedure

## Requirements and local development

Use Node.js 24 and npm. Install the locked dependencies and start Vite:

```sh
npm ci
npm run dev
```

For a production build and local Cloudflare Worker runtime:

```sh
npm run cf:preview
```

The local preview normally listens at `http://127.0.0.1:8787`.

## Environment configuration

No required runtime secrets or variables are configured. `NEXT_PUBLIC_SITE_URL` optionally overrides the canonical origin for an approved preview; it defaults to `https://abutosystems.com`. Never place credentials in `NEXT_PUBLIC_*` variables. Wrangler credentials remain in its local credential store.

## Scripts

- `npm run dev`: local Vite development server
- `npm run build`: optimized Worker and browser asset build
- `npm run start`: serve the built app with Wrangler locally
- `npm run cf:preview`: build, then serve through Wrangler
- `npm run deploy`: build and deploy to Cloudflare Workers (requires an authenticated and verified account)
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript validation
- `npm test`: build and verify routes, metadata, headers, assets, and 404 behavior through Wrangler
- `npm run test:e2e`: Playwright checks using local Wrangler

## Brand and product structure

Abuto Systems is the parent company. AskanPharma is a product by Abuto Systems. Product entries live in `data/projects.ts`; add another product only after its name, ownership, copy, assets, and destination are verified. Keep product branding distinct from the company identity.

## Contact form integration

The contact form validates and prepares an inquiry in the browser; it does not deliver a message. Direct email and WhatsApp details currently displayed on the site are approved project details. To enable form delivery, select an approved provider, add server-side validation and abuse protection, and store credentials in Cloudflare Worker secrets or bindings. Never expose a provider key to browser code.

## Security and SEO

The app applies response security headers in `proxy.ts` for Worker-generated responses and uses `public/_headers` for static assets. Canonical metadata, sitemap, robots rules, Open Graph assets, and Organization JSON-LD use the confirmed production origin. Keep `.env*`, tokens, private keys, and generated output out of Git. Review `npm audit` before releases.

## Deployment

Deployment is manual through Wrangler; GitHub automatic deployment is not configured. Production is live at `https://abutosystems.com`; `www.abutosystems.com` permanently redirects to the apex. The preview remains available at `https://abuto-systems-website.ridgejunior204.workers.dev` and is noindexed. The Cloudflare Dashboard reported zero DNS records before binding; Cloudflare-managed Worker Custom Domains now serve the apex and `www`. DNSSEC and exact post-binding DNS record metadata remain unverified because the API login lacks DNS Read. See [the Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md) for release details and rollback steps.
