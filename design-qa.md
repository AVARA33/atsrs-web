# ATSRS V538 Back to Home Hover QA

## Evidence

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-c0b36c4f-2e9c-4c77-a730-a8c78be57d3b.png`.
- Implementation: `docs/qa/v538-back-home-hover.png`.
- Combined focused comparison: `docs/qa/v538-back-home-comparison.jpg`.
- State: logged-out Login page, Light mode, pointer hovering over Back to Home.
- Browser viewport: 1280×720 CSS px at 1× density.

## Findings and comparison history

1. Initial P2: underline was applied to the complete flex link, so it also appeared below the arrow icon.
2. Fix: the link and icon keep `text-decoration: none`; hover/focus underline is scoped to the text `span` only.
3. Post-fix computed styles: parent `none`, icon `none`, text `underline`.
4. No actionable P0/P1/P2 issues remain.

## Required fidelity surfaces

- Fonts and typography: existing type, weight and underline offset are unchanged.
- Spacing and layout rhythm: icon, gap, hit target and absolute position are unchanged.
- Colors and visual tokens: unchanged in Light and Dark modes.
- Image quality and asset fidelity: no image or logo asset changed.
- Copy and content: unchanged.

## Runtime checks

- Pointer hover: passed; only Back to Home text is underlined.
- Keyboard focus treatment: retained and scoped to text only.
- Focused automated tests: 3 passed, 0 failed.
- Browser console errors: 0.

final result: passed
