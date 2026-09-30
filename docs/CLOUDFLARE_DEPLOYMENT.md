# Cloudflare deployment and production release

## Current status

The production site is live at `https://abutosystems.com`. `www.abutosystems.com` redirects permanently to the apex. The current Worker version is `1f755c30-bbe5-4783-9d23-f1ae9c0636ac`, deployed 2026-09-30 at 02:00:51 UTC. It was deployed from the validated working tree before the final Git commit; repeat deployment from the committed source to establish exact Git SHA traceability.

The Cloudflare Dashboard was manually inspected before binding and reported **0 of 200 available DNS records** and “No DNS records.” Before-state: no visible A, AAAA, CNAME, MX, TXT, or CAA records; no visible apex, `www`, or wildcard record. Cloudflare-managed Worker Custom Domains are now attached for the apex (domain ID `f0afd017b926e8514b0e881994d972e0eaa3d127`, certificate ID `faa894ff-ef42-45f4-98e0-33a1f829027f`) and `www` (domain ID `6e325626b57389cf36744e0c9bb42d439eca9de4`, certificate ID `9832968b-f940-481e-a9d9-3e8c13ab7332`). DNSSEC remains unverified and was not changed. The Wrangler OAuth login still lacks DNS Read, so the post-binding DNS records could not be enumerated through the API.

Read-only Cloudflare API checks before binding found 0 Worker custom domains, 0 Worker routes, and 0 Pages projects in the active zone/account. The Redirect Rules endpoint returned HTTP 403, so existing rules could not be enumerated or changed. The site Worker now issues a permanent 301 for HTTP apex requests and for all `www` requests, preserving the path and query while redirecting to the HTTPS apex. The live checks confirmed both redirect paths work in one hop. No Cloudflare Redirect Rule was created.

The apex passed all 14 Playwright checks against the live Worker after the final application change, including canonical URLs, response security headers, a real 404, in-app navigation, static assets, SEO routes, contact flows, responsive behavior, keyboard navigation, and automated accessibility checks. `https://abutosystems.com` is indexable; the `workers.dev` preview returns `X-Robots-Tag: noindex`. The source changes are not yet committed or pushed; commit and push after recording the final deployment from the committed source.

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

The DNS record before-state was manually verified in the Cloudflare Dashboard. DNSSEC is not verified and was not changed during this release. Application-level inspection before binding found no Worker custom domains, Worker routes, or Pages projects. Redirect Rules remain unverified because the API returned HTTP 403. Cloudflare's managed Custom Domain API attached the apex and `www` to the existing Worker; public DNS now resolves both hosts to Cloudflare anycast addresses. Do not manually alter DNS records as part of this release.

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

Production acceptance passed: HTTPS and TLS worked for the apex and `www`; all 14 live Playwright tests passed against the apex; the branded 404 returned HTTP 404; the HTTP apex and HTTP/HTTPS `www` requests redirected once to the HTTPS apex while preserving path/query; security headers, sitemap, robots, canonical metadata, contact links, responsive behavior, keyboard use, and automated accessibility checks passed. The initial zero-record before-state came from the Cloudflare Dashboard. After-state public DNS showed Cloudflare A/AAAA answers at both hosts. Exact DNS records and DNSSEC status remain unverified because the account lacks read permission. The current Worker version was deployed before its final commit; redeploy the same committed source and rerun critical production smoke/browser checks to complete traceability.

For a faulty Worker version, use the Cloudflare Workers Deployments UI to restore the last known-good version and recheck preview and production routes. If only the custom-domain binding or redirect is faulty, change that specific binding or rule after verifying the previous DNS and serving state. Never delete the zone, change nameservers, or use force-push as rollback.
