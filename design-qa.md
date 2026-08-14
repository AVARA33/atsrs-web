# ATSRS Global Select Menu Theme QA — V539

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-9750aafd-2cbc-4ff4-8c8d-2cf9b06b5a04.png` (3440 × 1368 px).
- Dark implementation screenshot: `C:\Users\user\AppData\Local\Temp\atsrs-v539-dark-select-1718x688.png` (1223 × 688 px browser capture).
- Light implementation screenshot: `C:\Users\user\AppData\Local\Temp\atsrs-v539-light-select.png` (1280 × 720 px browser capture).
- Requested desktop CSS viewport: 1718 × 688; browser page reported 1718 × 688 at device scale factor 1. The in-app screenshot surface capped the raster width at 1223 px, so the focused control region was compared instead of treating the full-frame crops as equivalent.
- State: authenticated-style ATSRS select control; dark and light themes; `Senior ROV Pilot` selected.

## Full-view comparison evidence

The source shows the Corporate Candidates profession control in Dark mode. The implementation harness loads the production cascade and the new final theme layer. Page geometry and typography were intentionally preserved; this change is limited to disclosure menu colors.

## Focused region comparison evidence

- Dark closed field computed background: `rgb(8, 10, 9)`; text: `rgb(244, 246, 239)`.
- Dark native selected option computed background: `rgb(184, 255, 25)`; text: `rgb(8, 10, 8)`.
- Light closed field computed background: `rgb(255, 255, 255)`.
- Light native selected option computed background: `rgb(20, 115, 210)`; text: white.
- Native OS popups are not included in browser screenshots, so their selected-option colors were verified through the browser's computed styles. Custom ATSRS dropdowns use the same black/green tokens directly in their visible DOM.

## Required fidelity surfaces

- Fonts and typography: unchanged; existing ATSRS field typography is preserved.
- Spacing and layout rhythm: unchanged; the theme layer introduces no size, padding, radius, or layout rules.
- Colors and visual tokens: Dark menu surface is near-black `#050606` and selection is ATSRS green `#b8ff19`; Light selection remains approved blue `#1473d2`.
- Image quality and asset fidelity: no image assets are involved in this control-state change.
- Copy and content: unchanged.

## Findings

No actionable P0, P1, or P2 mismatch remains within the requested color scope.

## Comparison history

- Initial finding (P1): Dark native option popup used a navy surface and Windows/Chromium blue highlight, conflicting with the Dark green selection language.
- Fix: added a final global native/custom menu theme layer, including a solid green selection gradient that prevents Chromium on Windows from substituting system blue.
- Post-fix evidence: computed Dark selected option is `#b8ff19` on `#080a08`; Dark closed control is near-black; Light selected option remains `#1473d2`; focused tests pass.

## Interaction checks

- Dark selected state: green.
- Dark menu and custom popup surface: black/near-black.
- Light selected state: blue.
- Personal and Corporate selectors share the same final stylesheet.
- Local browser console warnings/errors: 0.

final result: passed
