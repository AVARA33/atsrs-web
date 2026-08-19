# ATSRS Personal plan layout — Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-dcd45db4-1dc2-46ee-9ee9-4976765cd56b.png`
- Implementation screenshot: `C:\Users\user\Documents\GitHub\atsrs-personal-launch-readiness\tests\artifacts\plan-layout-dark-desktop-20260819.png`
- Mobile screenshot: `C:\Users\user\Documents\GitHub\atsrs-personal-launch-readiness\tests\artifacts\plan-layout-dark-mobile-20260819.png`
- Combined comparison: `C:\Users\user\Documents\GitHub\atsrs-personal-launch-readiness\tests\artifacts\plan-layout-comparison-20260819.png`
- Desktop viewport: 1600 × 1000 CSS px; screenshot 1584 × 1000 px at 1× density after scrollbar allocation.
- Mobile viewport: 390 × 844 CSS px; screenshot 374 × 844 px at 1× density after scrollbar allocation.
- State: public landing, `#plans`, dark theme.

## Full-view comparison evidence

The supplied production screenshot showed Free, Bronze, Silver and Gold in one four-column row with Titan missing. The revised implementation shows Free as a full-width first row and Bronze, Silver, Gold and Titan as four equal-width cards in the second row. Desktop measurements confirmed a 1350 px Free card and four 326 px paid cards. Mobile measurements confirmed five 343 px cards in a single column with no horizontal overflow.

## Focused comparison evidence

The focused plan-region comparison confirms that the existing ATSRS typography, dark surfaces, green accent, plan-specific top borders, button treatment and copy density are preserved. No replacement image or icon assets were required because the changed area contains only native plan-card content and the existing check treatment.

## Required fidelity surfaces

- Fonts and typography: existing Georgia display headings and system UI text are preserved; Free and paid-plan hierarchy remains consistent.
- Spacing and layout rhythm: Free is a compact full-width row; the four paid cards align evenly below it. The 1050 px breakpoint becomes two columns and the 720 px breakpoint becomes one column.
- Colors and visual tokens: existing background, border, muted text and ATSRS green tokens are preserved in light and dark themes. Titan uses the existing neutral Titan top-border token from the pricing page.
- Image quality and asset fidelity: no image assets were changed or approximated.
- Copy and content: the plan count is corrected from four to five and Titan links to the existing `pricing.html#titan` detail section.

## Findings

No actionable P0, P1 or P2 differences remain for the requested layout change.

## Comparison history

- Initial source finding: Titan was absent and Free occupied one paid-plan column.
- Fix: added Titan, moved Free to a full-width first row, added responsive two-column and one-column states, and corrected the plan-count copy.
- Post-fix evidence: dark desktop screenshot shows the requested 1 + 4 composition; mobile screenshot and measured geometry confirm responsive stacking.

## Primary interactions and console

- Titan and the other paid-plan detail links are present and target their existing pricing anchors.
- Theme toggle was exercised from light to dark.
- Browser console error check: no errors.
- Contract tests: public landing and pricing page passed.
- Cloudflare build: passed, 132 files.

final result: passed
