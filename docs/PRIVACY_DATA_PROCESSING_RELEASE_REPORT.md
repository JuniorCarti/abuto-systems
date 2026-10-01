# Privacy / Data Processing Release Report

**Audit date:** 2026-10-01
**Scope:** Repository implementation and candidate privacy disclosures for AskanPharma demo scheduling. This is an evidence review, not legal advice or a compliance certification. The scheduling implementation and the disclosure edits in this workspace have not been deployed.

## Existing disclosures

- The privacy page identifies Abuto Systems as a technology brand operating from Kenya, gives `abutosystems@gmail.com` for privacy requests, and describes contact/demo form fields, the D1 lead record, Turnstile, Cloudflare hosting, Resend email, retention, rights, and international processing.
- It already says the D1 database is in Western Europe, records are not publicly accessible through the website, the application has no automatic deletion schedule, and the organizer controls Calendar event retention.
- The terms distinguish a request from a confirmed appointment. The edited candidate wording now makes the Google-backed scheduling behavior conditional on that feature being available on the website.
- The cookies page describes the browser-side Turnstile script and says pre-clearance is off. The Calendar and Meet calls are server-side and do not embed a Calendar or Meet widget; no cookies-page change was needed.
- The policy's current statements about potential processing bases do not document which Kenyan transfer basis is selected for each provider or transfer.

## New Google processing

The repository requests only `calendar.events.freebusy` and `calendar.events.owned`. During availability checks, the Worker sends Google the organizer calendar identifier and the selected day's query interval to FreeBusy. The implementation does not send the form's contact fields in that request and does not query other calendar events for availability.

After the final availability check and D1 reservation, the Worker can insert the event before the customer-facing booking is confirmed. The insert includes an event title containing the business name, a description containing the customer's name, business, email, booking reference, and supplied phone, branch count, and notes when present; the selected start/end; the supplied email as attendee; and a Meet conference creation request. Calendar updates are requested with `sendUpdates=all`. The Worker reads back the event to verify the attendee and generated Meet URL. Only then does the UI receive `confirmed`. If that work stops earlier, an event or invitation may already exist while the UI reports a request for follow-up.

The browser receives only available slot starts/ends/labels from availability. A confirmed booking response includes the selected date/time and Meet URL. It does not include customer form fields, Google event identifiers, raw Google responses, or OAuth credentials. Responses are marked `no-store`.

The revised candidate privacy page describes the availability query, the event/attendee/Meet data and timing, the possibility that an event exists before confirmation, and an affirmative statement linking use of Google Workspace API data to the [Google Workspace User Data and Developer Policy, including Limited Use requirements](https://developers.google.com/workspace/workspace-api-user-data-developer-policy). Google requires an affirmative or similar Limited Use statement on the developer's website. [Google Workspace policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)

## Data categories

| Service | Data sent or stored | Purpose and exposure |
| --- | --- | --- |
| Abuto website / Worker | Form name, business/organization, email, phone, town, interest, preferred contact, branch count, date/time, free-text message, Turnstile token, idempotency header; request metadata | Validate, protect, route, and process an enquiry or demo. The Worker is the server-side recipient of the full request. Request bodies are not logged by the application. |
| Cloudflare Turnstile | Browser challenge signals and one-use token; Worker Siteverify request includes the token and, when present, the `CF-Connecting-IP` value | Bot/security verification. The integration does not send the form fields to Siteverify. Cloudflare says Turnstile does not access, store, or transmit form entries. Exact provider-side signal retention was not established. [Turnstile overview](https://developers.cloudflare.com/turnstile/) |
| Cloudflare D1 | Lead fields above except the Turnstile token/IP; generated lead reference and timestamps; hashed idempotency key; UTC start/end and `Africa/Nairobi`; booking/reservation status; event ID/link; Meet request ID/attempt/status/URL; invitation and notification status; safe error category | Persist follow-up and booking state; prevent duplicate submissions and simultaneous active reservations. D1 is bound only to Worker code in the repository; there is no public lead-read route or dashboard. The application has no automatic deletion job. |
| Google Calendar / Meet | FreeBusy: organizer calendar ID and requested time range. Event: title/business, customer's name/business/email, selected start/end, booking reference, and optional phone, branch count, and notes. Attendee email and Meet conference request are included; event response supplies event/Meet identifiers that the Worker stores. | Availability, creation/readback of the organizer event, attendee invitation/update, and conference creation. Calendar event data can be seen by the organizer and attendee according to Calendar sharing/invitation behavior; the site does not publish event details. |
| Resend | Internal notification: lead reference, name, business, email, phone, town, enquiry type, preferred contact, branches, date/time, submitted timestamp, and message. Customer confirmation: recipient email, name, confirmed date/time, duration/timezone, and Meet URL. Delivery metadata is also processed by the email service. | Send internal follow-up and, for confirmed bookings, a plain-text customer confirmation. The app uses the fixed sender `notifications@abutosystems.com` and internal destination `abutosystems@gmail.com`. Email content is not returned by the website. |

The D1 schema and code do not store OAuth access or refresh tokens. OAuth secrets are Worker bindings and were not inspected during this audit. The raw idempotency key is SHA-256 hashed before storage. The form permits free text and warns users not to submit health/patient or other sensitive information; the server does not detect or redact sensitive content before it is placed in Calendar/email fields.

## Cross-border processing

- **Cloudflare D1:** Per the operator-provided previously verified production facts, `abuto-systems-leads` has no jurisdiction restriction, a Western Europe region, and read replication disabled. Cloudflare's D1 documentation explains that `weur` means Western Europe, but a location hint by itself is not a guarantee; the actual region stated above is an operator-provided verified fact, not inferred from `wrangler.jsonc`. [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/)
- **Cloudflare request/security processing:** Worker and Turnstile handle requests through Cloudflare services. The specific locations and retention of request/security signals for this account were not verified.
- **Resend:** Resend states that stored data is in the United States, and that email/log retention is 30 days on Free, Pro, and Scale plans (with account-termination deletion within 90 days). The Abuto plan and executed account documents were not inspected, so the account-specific retention/contract cannot be confirmed. [Resend security and retention](https://resend.com/security)
- **Google:** Google's Calendar help says entries are stored in its data centers and encrypted in transit and at rest. Google's general retention materials describe account-controlled deletion and varying retention by service/settings. No exact storage region, Workspace edition/data-region configuration, account-specific terms, or retention period for this organizer/event was established. The organizer identity supplied for the integration is `abutosystems@gmail.com`; this alone does not establish the account's product/contract configuration. [Calendar privacy](https://support.google.com/calendar/answer/10366125), [Google retention](https://policies.google.com/technologies/retention)

Cloudflare documents D1 Time Travel retention as plan/storage-subsystem dependent (up to 7 or 30 days in its current documentation). The production plan and D1 storage subsystem were not inspected, so this audit cannot give an account-specific backup retention period. [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)

## Kenyan legal issue

The authoritative Kenya Law text of the Data Protection Act, 2019, section 48, and the Data Protection (General) Regulations, 2021, regulations 40–41, set conditions for transferring personal data outside Kenya. Regulation 40 lists appropriate safeguards, an adequacy decision, necessity, or data-subject consent as routes; regulation 41 describes safeguards and requires transfer documentation when that route is relied on, including date/time, recipient, justification, and a description of data, available to the Commissioner on request. Section 49 addresses transfers of sensitive personal data with additional consent and safeguard conditions. [Data Protection Act, Part VI](https://new.kenyalaw.org/akn/ke/act/2019/24/eng%402022-12-31/source), [Data Protection (General) Regulations, Part VII](https://new.kenyalaw.org/akn/ke/act/ln/2021/263/eng%402022-12-31/source)

This report does not select or assert a transfer mechanism. Provider statements about US/European storage or provider terms for other legal regimes do not, by themselves, establish the Kenyan legal determination for Abuto's particular transfers.

## Evidence gap

The repository does not contain a documented provider-by-provider Kenyan transfer assessment, selected legal basis, adequacy determination, safeguard instrument/assessment, transfer register, or evidence of any submission/proof to the Data Commissioner. It also does not establish the Google account's service/edition, data-region settings, exact event retention, the Cloudflare account's D1 backup/Worker-log retention settings, or the Abuto Resend plan and executed account documents. These gaps mean the legal transfer basis/safeguards and account-specific provider terms cannot be determined from this evidence. They are not proof of non-compliance.

The free-text field could contain sensitive data despite the warning; no such production submission was inspected. If that happens, section 49's additional requirements may be relevant and require human/legal assessment. No production lead content was accessed for this audit.

## Changes made

- `app/privacy/page.tsx`: made demo scheduling conditional on public availability; clarified the FreeBusy request fields, the pre-confirmation event/invitation possibility, event content, attendee/Meet actions, customer/internal email contents, and the Google Limited Use statement/link. Also made the IP forwarding description match the code's conditional use of `CF-Connecting-IP`.
- `app/terms/page.tsx`: made the Google-backed demo rules conditional on online scheduling being available and aligned confirmation language with the event, attendee, and Meet checks performed by the Worker.
- `app/cookies/page.tsx`: no change. Server-to-server Calendar/Meet API requests do not add a browser cookie or embedded tracker in this implementation.
- No production migration, deployment, commit, push, Calendar event, or verification submission was performed.

## Technical safeguards

- Server-side field validation, JSON content-type and body-size limits, same-origin validation when an `Origin` header is present, and a honeypot.
- Turnstile verification on availability, booking, and ordinary lead submissions; one-use tokens; the token and IP are not stored in the lead row.
- Parameterized D1 statements, transactional batch creation, SHA-256 idempotency hashes, deterministic Calendar event IDs, and a partial unique index preventing concurrent active reservations for the same start time.
- Only the two approved Calendar scopes; credentials remain in Worker secret bindings; Google errors map to safe categories; raw provider responses and credentials are not sent to the browser or application logs.
- Fail-closed availability and truthful request/confirmed states; email failure does not undo a confirmed booking; a Meet URL is only returned after Google supplies one.
- Resend sends plain text to fixed recipients/sender; stable idempotency keys are used for confirmations; logs omit message bodies and contain only safe error categories.
- Limits/evidence boundaries: there is no application-level rate limiter, no automated D1 retention/deletion job, no operator reconciliation dashboard, and no production booking has exercised these controls.

## Release classification

### A. FACTUAL DISCLOSURE READY

The candidate implementation and the revised repository privacy/terms text now describe the observed processing accurately enough for factual disclosure readiness, including Google availability, event creation before final confirmation, attendee/invitation and Meet handling, and the data sent to each service. This classification is for the candidate release after deploying the implementation and matching disclosures together. It does not say that the current production website has these changes, determine the Kenyan transfer basis/safeguards, or certify legal compliance. That separate determination remains for the human operator and Kenyan privacy counsel.
