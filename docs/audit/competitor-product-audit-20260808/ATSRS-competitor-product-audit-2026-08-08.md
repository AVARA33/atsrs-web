# ATSRS competitor and product audit

Date: 8 August 2026
Scope: Personal, Corporate and Candidate platforms. This is a product decision document, not an implementation approval.

## Executive recommendation

ATSRS should not become a generic HR suite or a full applicant-tracking system. Its defensible position is a user-controlled professional profile and document-compliance exchange: Personal users maintain verified-looking, current records; Corporate users discover eligible candidates, add them to Personnel, request controlled document access, and monitor date-based compliance.

The next product pass should make the current value easier to see before adding broad new modules: an action-first dashboard, clearer renewal/request queues, visible plan allowances, and audit-ready exports. Candidate discovery and permissioned sharing should remain the bridge between Personal and Corporate.

## Competitors reviewed

| Product | What it does especially well | What ATSRS should learn | Main caution |
|---|---|---|---|
| [ExpiryEdge](https://expiryedge.com/features/) | Connects deadline tracking, no-login document collection, escalation, workflows and one-click audit packs | Treat a renewal as an actionable workflow, not only a red/yellow status | Do not copy its broad SOP platform before ATSRS core journeys are polished |
| [Remindax](https://www.remindax.com/) | Simple expiry proposition, email/SMS/WhatsApp sequences, transparent limits and message credits | Expose message allowance and renewal status clearly; keep setup understandable | Do not make the dashboard a row of decorative metrics |
| [Expiration Reminder](https://www.expirationreminder.com/features) | Status-driven dashboard, standard reports, workspaces, advanced permissions, integrations and e-signatures | Status tiles should open useful filtered lists; reports should work without custom configuration | Asset, vehicle, equipment and policy modules would expand ATSRS too far without proven demand |
| [Certemy](https://certemy.com/solutions/track/) | Structured credential workflows, dependencies, verification, dashboards and HRIS/SSO integration | Later, model credential requirements and dependencies for regulated roles | Primary-source verification is operationally and legally heavy; do not promise it early |
| [Workable](https://www.workable.com/pricing) | Clear Recruiting/HR packaging, candidate workflows, add-ons and AI-credit explanation | Explain entitlements in plain units and keep Candidate-related paid value easy to understand | ATSRS should not copy job distribution, interview scheduling, payroll or performance management |

Captured evidence:

- `competitor-expiryedge.png`
- `competitor-remindax.png`
- `competitor-expiration-reminder.png`
- `competitor-certemy.png`
- `competitor-workable.png`

## ATSRS capability truth from the current repository

Already present or materially implemented:

- Personal and Corporate workspaces, plus a public Candidate directory and Company Personnel list.
- Document vault, manual upload, AI-assisted scan with review, expiry dates and dashboard risk counts.
- Candidate visibility controls, availability/work preferences, search and filters, secure messaging, CV view and Add to Personnel.
- General controlled profile sharing, download access requests, owner approval/decline, and audit events.
- Dedicated recipient links with OTP sessions, preview/download scopes, expiry/revocation and entitlement limits; currently canary/entitlement controlled.
- Corporate personnel compliance view and CSV report export based on uploaded-document dates.
- Server-side email notification foundation and WhatsApp notification foundation; WhatsApp is still presented as in development.
- Backend launch quotas: Free/Pro/Business currently enforce 20/200/2,000 files and 5/100/500 AI scans. AI CV allowance is 1 lifetime for Free, 3 per month for Pro/Titanium, and 10 per month for Business.

Important limits:

- Current compliance reporting checks document dates; it does not certify that a person is legally or operationally eligible for a role or project.
- Automated reports are still shown as planned.
- Multi-company is not yet a settled commercial/product model.
- Dedicated recipient links exist technically but should not be advertised broadly until entitlement, billing, staging and rollback are finalized.

## Decision table

| Capability | Decision | Product shape for ATSRS | Commercial placement |
|---|---|---|---|
| Action-first expiry dashboard | TAKE NOW | One priority queue: expired, today, 1–30 days, then 31–90 days; each status opens the filtered records | All plans |
| Renewal/document request link | TAKE NOW | Extend the existing controlled sharing/request model so a company can request specific missing or renewed documents without receiving unrelated files | Silver+ for reusable links; limited use on Free |
| Owner approval and request history | TAKE NOW | Keep preview separate from download; show pending, approved, declined and expired requests in one compact queue | All plans; higher active-link limits paid |
| Standard audit exports | TAKE NOW | Provide ready-made expiry, missing-document, request-history and personnel snapshot exports before a custom report builder | Corporate paid plans; basic CSV on Free/Personal where relevant |
| Plan and credit balance | TAKE NOW | Show files used, AI credits and message credits. Storage and active share links are quotas, not vague credits | Every plan |
| Notification sequences and escalation | TAKE NOW | Email baseline; paid SMS/WhatsApp message credits; optional owner/manager escalation when unresolved | Silver+ |
| Candidate readiness summary | TAKE NOW | Combine profile completeness, availability freshness and document-date status without claiming legal verification | All Candidate profiles; richer Corporate filters paid |
| Dedicated recipient links | TAKE NOW | Recipient-bound, expiring and revocable links with explicit preview/download scope | Silver/Titan; higher limits on Gold |
| Document version history | LATER | Retain the renewed file while keeping prior evidence and dates | Titan/Gold |
| Recurring renewals and acknowledgement | LATER | Support predictable renewals but require acknowledgement when evidence must be supplied | Titan/Gold |
| Multi-company | LATER | Separate company data strictly; offer a consolidated owner view only after tenancy and billing decisions are proven | Gold add-on or workspace packs; decision required |
| Role credential templates/dependencies | LATER | Define required document sets per role/project without claiming external verification | Gold |
| Primary-source credential verification | LATER | Integrate only for specific high-value jurisdictions/providers | Enterprise/custom add-on |
| E-signatures | LATER | Use an integration for acknowledgements and renewal forms | Gold/add-on |
| API, HRIS, SSO, Slack/Teams | LATER | Start with webhooks/calendar/export; add enterprise integrations from real demand | Gold/custom |
| Native mobile apps | LATER | Keep responsive web excellent first | Reassess after usage evidence |
| Full ATS/job-board distribution | DO NOT TAKE | ATSRS Candidate remains a controlled directory and compliance bridge, not a generic recruiting suite | — |
| Payroll, time off and performance HRIS | DO NOT TAKE | Outside the core promise | — |
| Vehicle/equipment maintenance suite | DO NOT TAKE | Add only if a defined customer segment proves demand | — |
| Dense customizable dashboard builder | DO NOT TAKE | Prefer a consistent action-first dashboard and focused reports | — |
| Opaque single credit wallet | DO NOT TAKE | Users must see what can be consumed and what resets | — |

## Proposed packaging direction

This is entitlement architecture, not final pricing.

| Plan | Primary user | Suggested included value |
|---|---|---|
| Free | Individual starting a professional profile | 20 files, 5 AI scans/month, 1 lifetime AI CV, email alerts, Candidate profile controls, limited controlled sharing |
| Silver | Active professional | About 100 files, 30 AI credits/month, 25 message credits/month, 3 active dedicated recipient links, standard exports |
| Titan | High-activity professional/consultant | Preserve the existing Pro baseline where practical: 200 files, 100 AI scans/month, 3 AI CV generations/month, 100 message credits/month, 10 active recipient links, version history |
| Gold | Company/compliance team | Preserve the Business baseline where practical: 2,000 files, 500 AI scans/month, 10 AI CV generations/month, 500 message credits/month, Corporate compliance reports, higher recipient-link limits, role templates and optional workspace packs |

Recommended allowance model:

- AI credits: scans and CV generation should be shown as separate counters or with an explicit conversion table.
- Message credits: SMS/WhatsApp only; email can remain included subject to abuse controls.
- Quotas: stored files, users/Personnel, active recipient links and workspaces should be shown as quantities, not credits.
- Credits should show balance, reset date and recent usage. Purchased top-ups should not silently expire without clear disclosure.

## Dashboard design direction

The dashboard should answer three questions in this order:

1. What needs my attention now?
2. What is safe/current?
3. What can I do next: renew, upload, approve, or share?

Use the base page surface and small functional cards only. Avoid one large wrapper card and card-inside-card stacks. The primary area should be a compact attention queue; summary statuses are secondary and clickable. A small Candidate/Sharing bridge can show profile readiness, visibility and pending company requests without pretending to be a job marketplace.

Required presentation constraints:

- Preserve the current ATSRS production visual language and do not change login/auth/loading.
- Light and dark themes, desktop/tablet/390px behavior, no clipped text or horizontal overflow.
- Minimum 44px touch targets, visible keyboard focus and readable status contrast.
- No marketing-only metrics and no unimplemented feature presented as live.

Generated visual directions:

- `design-option-1-priority-command-center.png`
- `design-option-2-compliance-timeline.png`
- `design-option-3-professional-profile-bridge.png`

## Recommended sequence

1. Choose one dashboard visual direction.
2. Validate it at desktop, tablet and 390px using realistic long names/document titles.
3. Finalize Free/Silver/Titan/Gold entitlements and the two credit pools.
4. Implement the dashboard and plan surface behind staging/backup/rollback.
5. Add standard reports and paid recipient-link limits before multi-company or integrations.
