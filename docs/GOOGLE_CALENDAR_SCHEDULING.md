# AskanPharma demo scheduling

This document describes the server-side Google Calendar integration for the existing `abuto-systems-website` Cloudflare Worker. It is an operator and implementation guide; any future deployment and Google verification submission remain human gates.

## Current release state

- The implementation is deployed at commit `2772181766f2ca57c2e01eb6ed86a0b318a6a9fc` (Worker version `cf517e26-bd59-442c-a618-b06d4bc7cb05`).
- Production Google secret presence must be checked by name only with `npx wrangler secret list --name abuto-systems-website`.
- One controlled production booking was manually completed after a successful Turnstile challenge. The confirmation page, Calendar invitation, branded confirmation email, and generated Meet link were confirmed by the operator.
- A read-only production D1 check found one confirmed booking for 2026-10-02 08:00–08:30 Africa/Nairobi. Calendar, conference, invitation, and notification states are successful; a stored Meet link is present. No personal form data or link is recorded here.
- Confirmed D1 bookings are treated as busy by the availability filter, so this interval is excluded. A live availability response was not requested because the route requires a valid one-use Turnstile challenge.
- No additional booking, event, conference, or email was created for verification. The controlled event is retained as evidence. Google verification has not been submitted.
- The one-time authorization helper uses the Google Desktop OAuth client and sends credentials directly to Wrangler over stdin. It never writes a credential file or displays the refresh token.

## Existing application flow

The contact enquiry flow remains `LeadForm → POST /api/leads → validation → Turnstile → D1 leads → best-effort internal Resend notification`. Demo submissions are rejected by that generic endpoint so they cannot bypass scheduling.

Demo scheduling uses two server routes:

- `POST /api/askanpharma/demo/availability` accepts a selected date and one-use Turnstile token. It generates half-hour candidates in `Africa/Nairobi`, checks Google FreeBusy and active D1 reservations, and returns only candidate start/end instants and EAT labels. Responses are `no-store`.
- `POST /api/askanpharma/demo/bookings` validates the form and token, rechecks FreeBusy, atomically reserves the slot in D1, creates or reconciles one Calendar event, requests Meet, and records the outcome. It only returns `confirmed` after the event includes the customer attendee and Meet generation succeeds.

The browser does not receive OAuth tokens, refresh tokens, Google event identifiers, raw Google API responses, or busy-event details. Both availability and booking require server-side Turnstile validation. The browser refreshes availability when a slot becomes unavailable.

## D1 state and concurrency

`migrations/0001_create_leads.sql` remains unchanged. `migrations/0002_demo_bookings.sql` adds `demo_bookings`, linked to the existing lead row. It records the selected UTC interval, timezone, status, Calendar event ID/link, Meet request/status/link, invitation status, confirmation-email state, and safe error category. It does not duplicate customer contact fields or store OAuth/API tokens.

The raw browser idempotency UUID is SHA-256 hashed before storage. The Calendar event ID is deterministically encoded using lowercase base32hex-compatible characters; the conference request ID is generated once and stored. A D1 partial unique index permits only one active `checking_calendar`, `pending_calendar`, or `confirmed` booking per UTC start instant. The D1 batch that activates a reservation is the final concurrency gate; the loser fails closed. Expired short-lived `checking_calendar` reservations are reset in the same D1 batch before a new reservation is attempted.

Calendar calls are outside the D1 transaction. If an event response is lost, the Worker fetches the deterministic event ID before trying an insert again. Meet retries patch the same event with a new persisted conference request ID only after Google reports the prior request failed. Pending/partial results remain in D1 and are never described as confirmed. A repeated browser submission reuses the idempotency key; Resend requests use stable keys, and an uncertain email-delivery result stays in `sending` so an ambiguous timeout cannot cause an automatic duplicate.

There is no admin calendar dashboard or background queue in this release. A visitor can retry a pending request from the same form; a permanently ambiguous external outcome needs operator follow-up through the existing Cloudflare/Google consoles.

## Service rules

- Organizer calendar: `abutosystems@gmail.com`.
- Timezone: `Africa/Nairobi`; EAT labels are presentation only.
- Duration: exactly 30 minutes, starting on 30-minute boundaries.
- Monday–Friday: 08:00–18:00 EAT, with the whole appointment inside hours.
- Saturday: 09:00–16:00 EAT, with the whole appointment inside hours.
- Sunday and past slots are rejected.
- Availability is checked once for display and checked again before reservation. Google or D1 uncertainty never produces available slots.
- Calendar notifications use `sendUpdates=all`. Calendar events include only the customer contact/business details needed for the demo; the form warns against health, patient, password, or payment details.

## Google OAuth setup

The Worker reads only these secrets at runtime:

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REFRESH_TOKEN`

The Worker exchanges the refresh token at Google's OAuth token endpoint for a short-lived access token per server request. Access tokens are kept in memory for that request only. Missing or invalid credentials fail closed. Do not add these names or values to `.env.local`, source code, `wrangler.jsonc`, the browser, or Git.

After confirming the Google Desktop client belongs to the owner-supplied Google project and that the project retains only the two approved scopes, the account owner can run this helper in an interactive terminal:

```powershell
node scripts/google-calendar-auth.mjs
```

The helper prompts for the Desktop client ID and secret without echoing either value; opens a temporary loopback listener on `127.0.0.1`; uses random state, PKCE S256, offline access, and explicit consent to obtain a refresh token; validates the granted scopes; and uses Wrangler's stdin-based secret bulk command to install the three values on the existing Worker. It prints only the secret names on success. The operator must complete the Google account authorization in the browser. Never capture terminal output or paste credentials into chat.

To inspect deployment metadata, use `npx wrangler secret list --name abuto-systems-website`; it returns names, never secret values. If any required name is missing, do not deploy. The helper needs an authenticated Wrangler session and the existing `node_modules` installation.

## Google API scope and behavior references

Implementation was checked against first-party docs:

- [Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth): `calendar.events.freebusy` reads availability on calendars the organizer can access; `calendar.events.owned` reads/creates/changes events on calendars the organizer owns. No broader scope is requested.
- [FreeBusy query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query): supports `calendar.events.freebusy`; requests RFC3339 `timeMin`/`timeMax` and the organizer calendar only.
- [Events insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert): supports `calendar.events.owned`, attendees, `sendUpdates`, and `conferenceDataVersion=1`.
- [Create events and Meet conferences](https://developers.google.com/workspace/calendar/api/guides/create-events): Meet generation uses `conferenceData.createRequest`; the response can remain pending, so the code polls and does not invent a link.
- [OAuth for Desktop apps](https://developers.google.com/identity/protocols/oauth2/native-app): supports loopback IP authorization for Desktop OAuth clients and PKCE; the manual OOB flow is unsupported.
- [OAuth web server/refresh token](https://developers.google.com/identity/protocols/oauth2/web-server): refresh tokens require offline authorization; `invalid_grant` means renewed operator authorization is required.
- [OAuth verification](https://support.google.com/cloud/answer/13463073): apps requesting sensitive or restricted scopes may require verification; do not submit verification automatically.
- [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/): a batch executes sequentially as a transaction and rolls back on a failed statement.
- [Resend idempotency keys](https://resend.com/changelog/idempotency-keys): the email API supports `Idempotency-Key` and retains a key for 24 hours. D1 delivery state extends duplicate protection beyond that provider window.

The selected scopes cover the implemented calls: FreeBusy for predefined availability; owned-calendar event reads/creation/updates for one organizer-owned event, customer attendee, and its Meet conference. The application does not read event titles or descriptions to the browser, list calendar contents, manage ACLs/calendars, or access customers' Google accounts.

## Privacy and legal

`/privacy` now identifies Calendar event, attendee, and Meet processing; the data passed to Google; D1 scheduling state; the customer confirmation; and account-controlled Google Calendar retention. `/terms` distinguishes request-received from the specific confirmed state. `/cookies` does not claim that Google Calendar is embedded in the browser. These factual disclosures do not assert a transfer safeguard, adequacy finding, certification, or Kenyan legal compliance.

The owner should document the Kenyan cross-border transfer basis and safeguards applicable to Google processing, alongside the previously identified Cloudflare and Resend transfer review. This remains a follow-up for the active production service; this document does not assert legal clearance. The privacy notice must be revisited if Google retention/account settings or the actual event fields change.

## Operator validation plan

The 2026-10-02 production booking is the retained controlled evidence event. Do not create or cancel a replacement booking for this release record. The checks below describe additional behavior suitable for local automated tests or a separately approved controlled test; production verification must not bypass Turnstile or create duplicate side effects.

1. Submit a demo request from desktop and mobile.
2. Confirm a valid weekday start at 08:00 and a 17:30–18:00 appointment can be selected.
3. Confirm 18:00, Sunday, and past times cannot be booked.
4. Confirm Saturday 15:30–16:00 is selectable and 16:00 is not.
5. Put a busy Google event over a candidate slot and confirm it disappears.
6. Submit two concurrent requests for the same slot and confirm exactly one wins.
7. Confirm the D1 lead and booking state, exactly 30-minute interval, and `Africa/Nairobi` timezone.
8. Confirm the event appears in `abutosystems@gmail.com`, the customer attendee is present, and Calendar invitation updates were requested.
9. Confirm a unique Google Meet link is generated and the customer-facing link opens.
10. Confirm the Resend confirmation arrives with correct EAT start/end, duration, Meet link, and invitation wording.
11. Retry the same request/idempotency key and confirm no duplicate D1 row, Calendar event, Meet conference, or confirmation email.
12. Revoke/deny OAuth in a controlled test and confirm no available slots are returned and no fake confirmation is shown.
13. Confirm missing/invalid Turnstile tokens are rejected and availability cannot expose raw busy intervals.
14. Inspect browser responses and bundles for absence of Google secrets, access/refresh tokens, raw Google responses, and event details.
15. Review the live privacy/terms/cookie disclosure and confirm canonical URLs and the www redirect remain correct.

Automated local commands for this implementation:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm audit
npx wrangler d1 migrations apply abuto-systems-leads --local
npx wrangler deploy --dry-run
```

Tests mock Google, Turnstile, and Resend. Automated tests do not access production Google Calendar or send real email.

## OAuth verification package (final draft; not submitted)

### Scope justifications

- **`calendar.events.freebusy`:** The server queries FreeBusy for one owner-authorized organizer calendar to remove occupied 30-minute AskanPharma demo slots and recheck a selected slot immediately before reservation. It receives busy ranges only; the website does not expose event details. The broader `calendar` or read-only calendar scopes are unnecessary.
- **`calendar.events.owned`:** The server creates and reads back one event on the organizer's own calendar, adds the attendee, and persists/retries the event's unique Google Meet conference. An availability-only scope cannot create or update events. The app does not access calendars the organizer does not own or manage calendar ACLs.

The production flow was manually confirmed. Idempotency and concurrency are supported by implementation and automated regression tests; no second production booking was made to test them.

### Verification video script

Record the real production flow and retained controlled booking. Keep attendee email, personal form data, credentials/tokens, private account identifiers, and the complete Meet URL out of frame. Do not record a new consent grant or submit another booking for the video.

1. Open `https://abutosystems.com` and the AskanPharma demo page. Show Abuto Systems identity, the 30-minute appointment rule, and that a selected time is a request until confirmed.
2. Show the production availability experience without exposing another person's calendar details. Explain that the server queries FreeBusy for the organizer calendar and suppresses occupied slots using busy ranges only.
3. Show the retained booking's confirmation state and the 2026-10-02, 08:00–08:30 EAT interval. State that it followed a successful Turnstile challenge. Do not submit the form again.
4. Show the corresponding event in the organizer-owned Calendar. Hide the attendee address while showing organizer ownership, 30-minute start/end, attendee/invitation presence, and the attached Meet conference. Redact the event ID and full Meet URL.
5. Show the branded confirmation message with sender identity, time, timezone, duration, and invitation wording. Hide recipient addresses and redact the Meet URL.
6. Explain that `calendar.events.freebusy` finds and rechecks open times; `calendar.events.owned` creates/read backs/updates the organizer-owned event, adds its attendee, sends the invitation, and attaches its Meet conference. Customers do not connect Google accounts, and no broader Calendar scopes are requested.
7. If including the Google consent screen, show only the already configured requested scope names and redact account identity. Do not enter credentials, grant new access, or imply that the video submits verification.

### Verification Centre Additional Info

> Abuto Systems provides AskanPharma and uses Google Calendar to schedule virtual product demonstrations on one organizer-owned calendar. The website uses `calendar.events.freebusy` to find open 30-minute times and recheck a selected time before booking. It uses `calendar.events.owned` to create and read back the corresponding organizer-owned event, add the requested attendee, send the Calendar invitation, and attach the Google Meet conference. Customers do not connect their Google accounts. The service does not list calendars, expose event details, or request broader Calendar scopes. The customer’s submitted contact details and selected time are sent to Google only to create the requested event and invitation. If Calendar or Meet cannot complete, the website reports that the request needs follow-up rather than claiming the booking is confirmed. The production flow has been manually confirmed: one controlled request resulted in a confirmed 30-minute event in Africa/Nairobi, a Calendar invitation, a generated Meet conference, and a branded confirmation email. No additional production booking was created for verification.

### Human submission checklist

1. Confirm the intended Google Cloud project and OAuth client, and that their configured scopes are exactly `calendar.events.freebusy` and `calendar.events.owned`.
2. Review the current Verification Centre request, scope classifications, and evidence requirements. Do not add broader scopes.
3. Check the published homepage, support contact, privacy policy, terms, and data handling statements against deployed behavior. Resolve the cross-border transfer safeguards review above before making legal or compliance claims.
4. Record and review the video using the script above. Redact recipient addresses, attendee email, personal form contents, account identifiers, event IDs, credentials, tokens, and the full Meet URL.
5. Paste the Additional Info text above and confirm every statement matches the live application and current Google project configuration.
6. Upload reviewed evidence, inspect the final form, and submit manually only when the owner is ready. This document does not submit the request.
