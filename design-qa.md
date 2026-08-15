# ATSRS V562 Public Legal Footer Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-15945ed4-b87d-405c-9990-bbee41808f45.png`
- Rendered implementation: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-legal-footer-viewport.png`
- Light-mode implementation: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-legal-footer-light.png`
- Combined comparison: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-footer-comparison.png`
- Verification viewport: 1265 × 720 CSS px at DPR 1
- Source dimensions: 2560 × 1528 px. Implementation viewport capture: 1264 × 720 px.
- State: Data Rights route at page bottom in Dark and Light mode.

## Full-view comparison evidence

The supplied Home screenshot establishes the canonical public footer: a centered six-link legal row above a divider, with copyright left and the security-report link right. The legal pages now use that exact structure and shared styling.

## Focused region comparison evidence

The combined comparison confirms the Data Rights footer matches the Home footer hierarchy, alignment and spacing. The previous dot-separated inline footer has been removed. Browser checks report six legal links, both bottom-row items and zero horizontal overflow.

## Required fidelity surfaces

- Typography: inherited from the shared Home footer.
- Spacing and layout rhythm: centered legal navigation, full-width divider and separated bottom row match the reference.
- Dark colors: canonical black surface and muted legal-link color preserved.
- Light colors: existing white/blue public palette preserved.
- Assets and logo behavior: unchanged.
- Copy: Home footer legal labels are used consistently on all seven public legal pages.

## Primary interactions and runtime checks

- Data Rights Dark: passed; six centered legal links and split bottom row visible.
- Data Rights Light: passed; same structure and dimensions retained.
- Horizontal overflow: 0 px.
- Footer link count: 6.
- Bottom row: copyright and `Report a Security Issue` both present.
- Focused public legal-page, privacy and Dark-surface regression tests: passed.

## Comparison history

- P2: legal pages used a compact dot-separated footer that did not match Home.
- Resolution: replaced it with the shared Home-style legal navigation and bottom metadata row.
- Final comparison: no remaining P0, P1 or P2 mismatch in the requested footer scope.

## Final result

final result: passed
