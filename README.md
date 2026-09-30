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

- `app/`: route pages, metadata routes, favicon, and global styles, including `/products/askanpharma/demo` and `/api/leads`
- `components/`: shared navigation, footer, forms, cards, and page sections
- `data/`: reusable solutions, products, and portfolio content
- `lib/`: approved contact links, Nairobi business-hours rules, site origin, and shared lead validation
- `migrations/`: forward-only Cloudflare D1 schema migrations for form requests
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

Before testing a successful form submission locally, copy `.dev.vars.example` to `.dev.vars`, apply the D1 migration locally with `npx wrangler d1 migrations apply abuto-systems-leads --local`, and run `npm run test:e2e`. Playwright injects Cloudflare's public test sitekey; `.dev.vars.example` contains its matching test secret. These dummy keys always pass and must never be used in production. The local D1 database lives under ignored `.wrangler/` state.

## Environment configuration

`NEXT_PUBLIC_SITE_URL` optionally overrides the canonical origin for an approved preview; it defaults to `https://abutosystems.com`. Form submission also needs the public `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build time, a Worker secret named `TURNSTILE_SECRET_KEY`, and a `LEADS_DB` D1 binding. Never place credentials in `NEXT_PUBLIC_*` variables. Wrangler credentials remain in its local credential store.

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

## Contact and demo requests

The contact and AskanPharma demo forms share `/api/leads`. The Worker validates payload size, field types and lengths, preferred contact method, and demo dates/times using `Africa/Nairobi`; it verifies Turnstile server-side and only shows success after a parameterized D1 insert succeeds. Demo dates and times are requests, not confirmed bookings. The forms never ask for patient, medical, account, or payment information.

Create and bind the D1 database with `npx wrangler d1 create abuto-systems-leads` (keep Wrangler's generated binding in `wrangler.jsonc` and ensure its binding name is `LEADS_DB`). Apply the reviewed migration with `npx wrangler d1 migrations apply abuto-systems-leads --remote`, then set the Worker secret with `npx wrangler secret put TURNSTILE_SECRET_KEY`. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the build environment and deploy the existing Worker. Until these values and the binding are configured, the form is intentionally unavailable and cannot report a false success.

Accepted requests are stored in D1 for manual follow-up; this release does not send email notifications and does not expose an admin dashboard. Authorized operators can review the `leads` table through the Cloudflare D1 console or `npx wrangler d1 execute abuto-systems-leads --remote --command "SELECT id, kind, name, organization, email, phone, preferred_date, preferred_time, created_at FROM leads ORDER BY created_at DESC"`. Handle results as private lead data and remove records when they are no longer needed. No submissions are written to application logs.

## Security and SEO

The app applies response security headers in `proxy.ts` for Worker-generated responses and uses `public/_headers` for static assets. Canonical metadata, sitemap, robots rules, Open Graph assets, and Organization JSON-LD use the confirmed production origin. Keep `.env*`, tokens, private keys, and generated output out of Git. Review `npm audit` before releases.

## Deployment

Deployment is manual through Wrangler; GitHub automatic deployment is not configured. Production is live at `https://abutosystems.com`; `www.abutosystems.com` permanently redirects to the apex. The preview remains available at `https://abuto-systems-website.ridgejunior204.workers.dev` and is noindexed. The Cloudflare Dashboard reported zero DNS records before binding; Cloudflare-managed Worker Custom Domains now serve the apex and `www`. DNSSEC and exact post-binding DNS record metadata remain unverified because the API login lacks DNS Read. See [the Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md) for release details and rollback steps.
