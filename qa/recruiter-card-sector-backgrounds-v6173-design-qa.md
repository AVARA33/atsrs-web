# Recruiter card sector backgrounds — V6174 design QA

## Scope

- Recruiter Directory cards only.
- Existing banner, filters, pagination, typography, dimensions, data and actions remain unchanged.
- Existing JobSearch artwork is reused; no portraits or new assets are introduced.

## Visual system

- Dark overlay: `rgba(8,16,12,.99)` → `.86` → `.30`.
- Sector tint: `rgba(var(--recruiter-card-accent-rgb),.18)`.
- Artwork layer opacity: `.56`.
- Light-theme artwork opacity: `.22` with a stronger white overlay.

## Responsive and content checks

- Desktop two-column layout retains `108px` minimum card height.
- Existing mobile one-column rules are unchanged.
- Artwork is non-interactive and remains behind all text and controls.
- Long names, missing LinkedIn/location, and vacancy counts use the existing layout and logic.
- Mapping is deterministic by company, then role keywords, then generic network fallback.

## Verification

- Focused automated tests: passed.
- Production build: passed.
- Live V6174 browser capture: passed in the authenticated Recruiter Directory.
- Verified the first 12 cards received the expected deterministic categories and loaded artwork.
- Verified every sampled desktop card remained exactly `108px` high.

## Result

Final result: passed.
