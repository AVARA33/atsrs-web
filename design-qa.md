# ATSRS V562 Canonical Dark Surface Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-9a73df18-2a9c-4a67-bdde-043b041bd838.png`
- Rendered implementation: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-data-rights-dark.jpg`
- Combined comparison: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-dark-surface-comparison.jpg`
- Verification viewport: 1280 × 720 CSS px at DPR 1
- Source dimensions: 2560 × 1520 px. Implementation capture: 1280 × 1874 px full page. Comparison columns were normalized for visual review.
- State: public Home, Pricing, Privacy and Data Rights routes in Dark mode; Data Rights also verified in Light mode.

## Full-view comparison evidence

The supplied screenshot showed legacy navy surfaces inside an otherwise black Dark-mode page. The implementation keeps the established ATSRS layout, typography and lime accent while replacing those source navy surfaces with one neutral black surface system. Light mode remains white and blue.

## Focused region comparison evidence

The public header, summary cards, contents panel, notices and article panels now share the same neutral Dark palette. Computed browser colors confirm the header is `rgba(5, 6, 6, 0.96)` and representative panels are `rgb(11, 13, 13)`. No route tested has horizontal overflow.

## Required fidelity surfaces

- Typography: unchanged.
- Spacing and layout rhythm: unchanged; no wrapper or shell was added.
- Dark colors: canonical background `#050606`, panel `#0b0d0d`, soft panel `#111414`, border `#2a2f2d`; ATSRS lime accents preserved.
- Light colors: existing white and blue palette preserved.
- Assets and logo behavior: unchanged.
- Copy and legal content: unchanged.

## Primary interactions and runtime checks

- Data Rights Dark: passed; black header and neutral panels, zero horizontal overflow.
- Privacy Dark: passed; black header and neutral panels, zero horizontal overflow.
- Pricing Dark: passed; black header and neutral plan cards, zero horizontal overflow.
- Home Dark: passed; black header and neutral cards, zero horizontal overflow.
- Data Rights Light: passed; white cards and existing light header preserved.
- Focused regression tests: passed.

## Comparison history

- P1: legacy blue/navy panels remained on legal routes after the shared-header change.
- Resolution: removed the legacy source tokens and loaded the canonical theme authority last on every public/legal route.
- Final comparison: no remaining P0, P1 or P2 mismatch in the requested surface-color scope.

## Final result

final result: passed
