# Cloudflare deployment and production release

## Current status

### Prompt 9 lead notification work

The current source adds a best-effort Cloudflare `send_email` notification after a lead insert succeeds in D1. The binding is restricted to `abutosystems@gmail.com` and `notifications@abutosystems.com`; message subjects and sender/recipient are server-controlled, and the body is plain text. General enquiries, virtual consultation enquiries, and AskanPharma demo requests have separate subjects/content. If email sending fails, the accepted D1 lead remains stored and the visitor still receives the normal receipt response. This source change has not been deployed.

Cloudflare lists `abutosystems@gmail.com` as verified (2026-09-30). The `abutosystems.com` Email Routing settings currently report disabled/unconfigured. Email Sending settings and DNS API requests return Cloudflare error 2036 (Unauthorized), so sender-domain onboarding and its proposed DNS records have not been applied. Before production deployment, an account administrator must confirm Email Sending is available and review the exact onboarding records in Cloudflare. Stop if Cloudflare requires a paid plan or proposes changes that affect existing mail/DNS. The current production Worker remains on its prior release until this gate is cleared.

The production site is live at `https://abutosystems.com`. `www.abutosystems.com` redirects permanently to the apex. The current Worker version is `70fcd848-9513-4f60-8f57-e84a2f157f41`, created 2026-09-30 at 18:22:35 UTC. The current Git branch began Prompt 9 at `92986075a3e743d33d484b4b56f9f3147b1bf530`; Prompt 9 source is not deployed until the sender-domain gate is cleared.

The Cloudflare Dashboard was manually inspected before binding and reported **0 of 200 available DNS records** and “No DNS records.” Before-state: no visible A, AAAA, CNAME, MX, TXT, or CAA records; no visible apex, `www`, or wildcard record. Cloudflare-managed Worker Custom Domains are now attached for the apex (domain ID `f0afd017b926e8514b0e881994d972e0eaa3d127`, certificate ID `faa894ff-ef42-45f4-98e0-33a1f829027f`) and `www` (domain ID `6e325626b57389cf36744e0c9bb42d439eca9de4`, certificate ID `9832968b-f940-481e-a9d9-3e8c13ab7332`). DNSSEC remains unverified and was not changed. The Wrangler OAuth login still lacks DNS Read, so the post-binding DNS records could not be enumerated through the API.

Read-only Cloudflare API checks before binding found 0 Worker custom domains, 0 Worker routes, and 0 Pages projects in the active zone/account. The Redirect Rules endpoint returned HTTP 403, so existing rules could not be enumerated or changed. The site Worker now issues a permanent 301 for HTTP apex requests and for all `www` requests, preserving the path and query while redirecting to the HTTPS apex. The live checks confirmed both redirect paths work in one hop. No Cloudflare Redirect Rule was created.

The apex passed all 14 Playwright checks against the live Worker after the final application change and again after the exact committed source was deployed, including canonical URLs, response security headers, a real 404, in-app navigation, static assets, SEO routes, contact flows, responsive behavior, keyboard navigation, and automated accessibility checks. `https://abutosystems.com` is indexable; the `workers.dev` preview returns `X-Robots-Tag: noindex`. The production release commit is `d619041353ede87a6eacb26813610efc0c604cf6`; it still needs to be pushed to GitHub.

## Architecture

- Next.js App Router 16.3.7 and React 19.2.8 run through vinext 1.0.0, Vite 8.3.1, and `@cloudflare/vite-plugin` 1.62.2.
- Wrangler 4.144.0 builds and serves a Cloudflare Worker. The generated Worker uses `vinext/server/fetch-handler`; browser assets are emitted into `dist/client` and served through the `ASSETS` binding.
- Server rendering and React Server Component navigation execute in the Worker. Static export was tested and rejected because in-app navigation produced missing RSC payloads.
- `wrangler.jsonc` enables `workers.dev` and preview URLs and does not configure a production custom domain.
- No API route, form delivery backend, database, or external cache is configured.
- GitHub automatic deployment is not configured. Releases are manual and use Wrangler.

Cloudflare's current guide recommends vinext for new Next.js Workers projects and describes it as beta. This repository's `npx vinext check` reported 96% compatibility and no unsupported APIs. Recheck the guide and compatibility report when upgrading. References: [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Local release checks

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit
npx wrangler deploy --dry-run
```

`npm run cf:preview` builds the app and starts Wrangler at `http://127.0.0.1:8787` (or use `--port 3002` for the Playwright suite). It is a local Worker runtime check, not a substitute for a deployed Cloudflare preview. Do not include `dist`, `.wrangler`, `.vite`, `.vinext`, test output, or credentials in Git.

## Virtual operations and lead forms

The feature release adds Nairobi service hours, a virtual consultation enquiry, the `/products/askanpharma/demo` route, and a Worker `POST /api/leads` handler. No form database, Turnstile keys, or outbound email provider existed in the prior deployment. The handler validates on the server, verifies Turnstile, and only confirms receipt after D1 storage succeeds. Without the production binding and keys, it fails closed and the browser disables submission.

The D1 migration is `migrations/0001_create_leads.sql`. The dedicated `abuto-systems-leads` database is bound as `LEADS_DB` in the existing `wrangler.jsonc`, and the reviewed migration has been applied to the empty production database. The same migration can be applied locally with `npx wrangler d1 migrations apply abuto-systems-leads --local`. The production Turnstile widget is restricted to `abutosystems.com`; its secret is stored as `TURNSTILE_SECRET_KEY` on the existing Worker, and its public `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is stored in ignored `.env.local` for production builds. Do not commit either key or a placeholder database ID. This uses Cloudflare D1, which has a free Workers plan tier; if account usage requires a paid plan, stop and get billing approval before upgrading.

Accepted leads are stored in D1 for manual follow-up. Operators can review requests in the D1 console or run a narrowly scoped query that omits message contents. Treat query output as private contact data. The submitted fields and retention/deletion instructions are documented in the repository README.

The current account session is authenticated and the existing production D1 and Turnstile bindings are configured. The active production D1 database is `abuto-systems-leads`; no migration is needed for the notification change. Keep the existing Turnstile validation and D1 storage path intact.

## Validation record

Validated from the repository using Node.js 24.14.0, npm 11.9.0, and Wrangler 4.144.0:

- `npm ci` — passed; added 493 packages, audited 494, 0 vulnerabilities
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed; production build and Worker route checks
- `npm run test:e2e` — passed; 14 local browser tests
- `npm audit` — passed; 0 vulnerabilities
- `npx wrangler deploy --dry-run` — passed
- `npm run deploy` — deployed the Cloudflare preview; the CLI completed its Worker build and upload
- PowerShell `$env:PLAYWRIGHT_BASE_URL = 'https://abuto-systems-website.ridgejunior204.workers.dev'; npm run test:e2e` — passed; 14 live-preview browser tests

The Vite build currently reports two ineffective dynamic-import warnings inside vinext and marks route classification unknown because its static analysis cannot identify all dynamic APIs. They do not fail the build. `next/image` is configured unoptimized; enabling Cloudflare Images would require an explicit optimization setup and binding.

## Inspect the zone before production domain binding

1. In a terminal with browser access, run `npx wrangler login`, complete Cloudflare's browser authorization, then run `npx wrangler whoami`.
2. Confirm the authenticated account owns or is authorized to deploy for the `abutosystems.com` zone.
3. The `abuto-systems-website` Worker name was verified unused before the preview deployment; it now belongs to this site.
4. The Dashboard inspection supplied for this release reported zero DNS records and no visible apex, `www`, or wildcard records. Preserve this as the before-state; DNSSEC remains unverified.
5. Before binding, read-only API checks returned zero Worker custom domains, routes, and Pages projects. Redirect Rules access returned HTTP 403. The resulting HTTPS apex and `www` requests were tested after binding; redirect behavior is implemented in the existing Worker.
6. Review `git diff` and confirm it contains no credentials or generated output.

The DNS record before-state was manually verified in the Cloudflare Dashboard. DNSSEC is not verified and was not changed during this release. Application-level inspection before binding found no Worker custom domains, Worker routes, or Pages projects. Redirect Rules remain unverified because the API returned HTTP 403. Cloudflare's managed Custom Domain API attached the apex and `www` to the existing Worker. At 2026-09-30 02:10 UTC, public DNS returned Cloudflare anycast A answers `172.67.178.163` and `104.21.17.228`, and AAAA answers `2606:4700:3036::6815:11e4` and `2606:4700:3033::ac43:b2a3`, for both hostnames. The DNS Read API permission is unavailable, so the zone's exact record metadata, CNAME view, MX/TXT/CAA after-state, and proxy flags could not be enumerated. Do not manually alter DNS records as part of this release.

## Deploy a preview

Only after account and collision checks pass:

```sh
npm run deploy
```

Record the generated `workers.dev` URL and Worker version/deployment ID. Verify over HTTPS:

- `/`, `/solutions`, `/products`, `/products/askanpharma`, `/about`, and `/contact`
- direct URL navigation, refresh, and in-app navigation on each route
- an unknown route returns HTTP 404 and the branded not-found page
- `robots.txt`, `sitemap.xml`, favicon, brand assets, project images, CSS, and JavaScript load successfully
- canonical and sitemap URLs use `https://abutosystems.com`, not localhost or `workers.dev`
- email and WhatsApp links use the approved project destinations
- browser console and network have no runtime, hydration, mixed-content, or missing-asset errors
- keyboard navigation, visible focus, labeled form fields, responsive widths, and reduced-motion preferences work

Do not bind the custom domain until every preview check passes.

## Bind production domains

Before making DNS changes, review and retain the zone's current record state. Do not change nameservers, registrar settings, mail records, or unrelated services.

1. Cloudflare's supported Worker Custom Domain API attached `abutosystems.com` to the existing `abuto-systems-website` Worker. Cloudflare created/managed its required DNS configuration and certificate.
2. After the apex returned HTTP 200 over HTTPS and passed the 14-test production browser suite, the same existing Worker was attached to `www.abutosystems.com` with Cloudflare's managed Custom Domain API.
3. The Worker proxy issues a permanent 301 to `https://abutosystems.com` for `www` requests and for HTTP apex requests. It preserves the path and query. Direct checks confirmed HTTPS and HTTP `www` requests redirect in one hop.
4. Public DNS lookups after binding returned Cloudflare anycast A and AAAA answers for both hosts. The authenticated account could not read the zone's DNS record list, so exact record metadata and proxy flags were not available to record. No MX/TXT/email configuration or nameserver change was made.

Cloudflare may require dashboard authorization, custom-domain confirmation, or security verification. Complete those steps in the account UI. Stop if the dashboard proposes replacing a conflicting record or changing nameservers.

## Acceptance and rollback

Production acceptance passed on the committed Worker source: HTTPS and TLS worked for the apex and `www`; all 14 live Playwright tests passed against the apex; the branded 404 returned HTTP 404; the HTTP apex and HTTP/HTTPS `www` requests redirected once to the HTTPS apex while preserving path/query; security headers, sitemap, robots, canonical metadata, contact links, responsive behavior, keyboard use, and automated accessibility checks passed. The initial zero-record before-state came from the Cloudflare Dashboard. After-state public DNS showed Cloudflare A/AAAA answers at both hosts. Exact DNS records and DNSSEC status remain unverified because the account lacks read permission. Push commit `d619041353ede87a6eacb26813610efc0c604cf6`; this documentation-only follow-up records deployment evidence and does not change the Worker source.

For a faulty Worker version, use the Cloudflare Workers Deployments UI to restore the last known-good version and recheck preview and production routes. If only the custom-domain binding or redirect is faulty, change that specific binding or rule after verifying the previous DNS and serving state. Never delete the zone, change nameservers, or use force-push as rollback.
