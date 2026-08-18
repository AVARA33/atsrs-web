# Home Job Search Showcase Design QA

## Source visual truth

- Existing Home design family and previous disclosure implementation: `source-production-accordion-1440-light.png`.
- Existing ATSRS Jobs card language and public Home tokens in `css/public-landing.css` and `css/jobs-prototype.css`.
- Approved user brief: always-visible major product section, 40–45% copy / 55–60% Jobs preview, Free/Bronze access explanation, no disclosure.

## Implementation evidence

- `implementation-1920-light.png`
- `implementation-1440-light.png`
- `implementation-1440-dark.png`
- `implementation-768-light.png`
- `implementation-768-dark.png`
- `implementation-390-light.png`
- `implementation-390-dark.png`

## Viewports and normalization

- 1920 × 1080 CSS viewport, browser capture 1905 × 1072 px, device scale factor 1.
- 1440 × 900 CSS viewport, browser capture 1425 × 891 px, device scale factor 1.
- 768 × 1024 CSS viewport, browser capture 753 × 1004 px, device scale factor 1.
- 390 × 844 CSS viewport, browser capture 375 × 812 px, device scale factor 1.
- Browser scrollbar/chrome capture deductions are consistent across source and implementation. The 1440 source and implementation are equal pixel dimensions.

## State and interaction coverage

- Job Search is always visible; section `details` count is 0 and no disclosure control remains.
- Light and dark themes captured at desktop, tablet and mobile.
- `Explore Jobs` navigates to `?view=jobs`; unauthenticated local verification correctly reaches the existing login gate.
- Three representative vacancy cards render; protected fields use compact lock indicators rather than whole-card blur.
- Console errors: 0. Horizontal overflow: 0 at every tested viewport.

## Full-view comparison

The previous 1440 light implementation presented the section as a focused disclosure with a narrow text area and no product proof. The revised 1440 light implementation preserves the same Home header, Georgia display typography, section width, blue token and border rhythm while replacing only the Job Search area with the approved full product showcase. The desktop split measures approximately 524 px copy / 754 px preview inside a 1350 px section, matching the requested visual priority.

## Focused-region comparison

- Typography: Home Georgia display face, existing body family, weights and tracking are retained. Headline is 42–66 px responsive and wraps cleanly at 390 px.
- Spacing/layout: desktop uses a balanced two-column split; tablet stacks copy then preview; mobile stacks Free, Bronze, preview and CTA with no horizontal overflow.
- Colors/tokens: all theme surfaces, borders, text and accents resolve through existing `--public-*` tokens. Light uses ATSRS blue; dark uses logo green `#b8ff19`.
- Image/assets: no new raster illustration was required. The preview is product UI and uses the existing Phosphor icon library; no emoji, custom SVG or CSS-drawn icon substitutes were introduced.
- Copy/content: Free visibility and restrictions, Bronze speed/convenience value, safe sample vacancy data, value line and both approved CTAs are present. No private recruiter contact information is exposed.

## Findings

No actionable P0, P1 or P2 findings remain.

## Comparison history

1. Initial implementation passed desktop hierarchy and theme checks but placed CTA before the Jobs preview in the stacked mobile flow (P2 order mismatch).
2. CTA was moved to its own grid area. Desktop keeps the action with the copy column; tablet/mobile now order content as copy → Free/Bronze → product preview → CTA.
3. Final recapture confirmed the corrected order, 48 px CTA height, three preview cards, and zero overflow at 1920/1440/768/390.

## Implementation checklist

- [x] Always-visible major Job Search section
- [x] Disclosure arrow/state/hidden content removed only from Job Search
- [x] Free and Bronze value explained without employment promise
- [x] Real ATSRS-style Jobs preview with safe sample data
- [x] Desktop, tablet and mobile hierarchy verified
- [x] Light/dark token parity verified
- [x] CTA routing verified
- [x] Build and focused tests passed

## Follow-up polish

No blocking polish remains.

final result: passed
