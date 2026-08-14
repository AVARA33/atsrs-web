# ATSRS V529 Complete Workspace Glass Card QA

## Evidence

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-e30173b1-09e3-4720-a976-24cfe5129892.jpg` (736 x 1104 px).
- Browser-rendered implementation: `tests/artifacts/v529/light-desktop.png`, `dark-desktop.png`, `light-mobile.png` and `dark-mobile.png`.
- Same-frame comparison: `tests/artifacts/v529/comparison-full.png` contains the reference plus the final Light and Dark desktop implementations.
- Viewports: 2294 x 735 desktop and 390 x 844 mobile.

## Measured Source Tokens

- Light canvas: top median `#CCD3DE`, lower median `#BAC9D9`.
- Dark canvas: top median `#151D2A`, lower median `#040A14`.
- Light card medians: `#BFCBD9` and `#C0CDDD` in two representative card regions.
- Dark card medians: `#141B28` and `#070D18` in two representative card regions.
- The cards are translucent; canvas colour remains visible through the material.

## Final Implementation

- Authenticated Light canvas: `#CCD3DE` to `#BAC9D9` with a restrained soft highlight.
- Authenticated Dark canvas: `#151D2A` to `#040A14` with a restrained navy highlight.
- Light card layers: `rgba(189,203,220,.62)` to `rgba(202,214,229,.46)`.
- Dark card layers: `rgba(23,31,46,.56)` to `rgba(11,18,30,.44)`.
- Backdrop blur: 20px with 122% saturation.
- Card radius: 18px desktop, 16px at 520px and below.
- Public Home, Login and Loading selectors are excluded.

## Coverage Fixes

V528 did not outrank several legacy per-page `!important` rules. V529 uses deliberate full selectors and corrects the omitted `talent-messages-panel` class. The same material now covers:

- Personal and Corporate Dashboard summary cards and lower functional panels.
- References CV panel, AI CV panel and the functional Main CV row.
- Profile Work Availability and owner-only Admin Overview cards.
- Product Updates roadmap cards.
- Corporate Projects, Personnel, Candidates, Compliance and Reports cards.
- Recipient link/request cards.

## Verification

- Light/Dark theme switch: passed.
- Desktop and 390px card layout: passed.
- 390px horizontal overflow: 0.
- Focused regression suite: 15 files passed.
- Cloudflare Pages build: passed, 108 files.
- Same-frame comparison: no remaining P0/P1/P2 mismatch in colour, translucency, radius, border, shadow or responsive geometry.

final result: passed
