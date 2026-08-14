# ATSRS V537 Light Brand Design QA

## Comparison target

- Source visual truth:
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-6b8ccd27-c2db-4eb6-99a0-3bf9d119ff81.png` — Dark Home baseline for the unboxed logo treatment and scale, 3439×1368 px.
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-22ed9b2a-8d97-463e-91f2-00c11ea70808.png` — supplied Light Login problem reference and approved blue/graphite artwork, 3439×1368 px.
- Implementation screenshots:
  - `docs/qa/v537-home-light.png` — desktop Home, 1425×891 px.
  - `docs/qa/v537-login-light.png` — desktop Login, 1440×900 px.
  - `docs/qa/v537-home-light-390.png` — 390 CSS px Home viewport; captured content 375×812 px after browser chrome/scrollbar handling.
  - `docs/qa/v537-login-light-390.png` — 390×844 px Login viewport.
  - `docs/qa/v537-brand-comparison.jpg` — combined source/baseline and implementation evidence.
- Density normalization: browser captures and source comparisons were reviewed at CSS scale; the focused brand comparison normalizes panels with contain scaling and does not judge browser chrome.
- State: logged out; Home and Login; Light mode. Dark Login was captured as the unchanged size/effect baseline.

## Findings

- No actionable P0/P1/P2 issues remain.
- The Light logo is rendered from a transparent 1108:384 canvas with the same `contain` box as Dark mode.
- Desktop Login measurements are identical in both themes: 420×145.55 CSS px.
- The white image card, 115% crop and multiply blend are removed. The TM mark remains visible at desktop and 390 px.
- ATS lettering and the person mark are graphite/black. RS and the illustrated mark retain the supplied blue/cyan luminosity.
- No black CSS shadow or drop-shadow is applied; the retained floor light is blue.

## Required fidelity surfaces

- Fonts and typography: unchanged; no text hierarchy or wrapping was altered.
- Spacing and layout rhythm: Home header and Login composition retain their existing dimensions; Light and Dark Login logo boxes match exactly.
- Colors and visual tokens: source blue/cyan and graphite artwork is preserved without multiply blending.
- Image quality and asset fidelity: high-resolution supplied artwork is converted to a transparent PNG; no CSS/SVG approximation or placeholder is used.
- Copy and content: unchanged.

## Interaction and runtime checks

- Home → Log in: passed.
- Login → Back to Home: passed.
- Light/Dark theme toggle: passed.
- Desktop and 390 px responsive visibility: passed; no logo clipping or horizontal overflow observed.
- Browser console errors: 0.
- Focused automated tests: 5 passed, 0 failed.

## Comparison history

1. Initial P1: Light asset used a full white presentation canvas at 115% scale, creating a card effect and clipping TM.
2. Fix: generated `atsrs-lockup-light-transparent.png`, changed rendering to `background-size: contain`, removed multiply blending and kept the existing Dark-mode dimensions.
3. Post-fix evidence: desktop and 390 px Home/Login captures show an unboxed logo, visible TM and matching Dark-mode scale.

## Follow-up polish

- None required for this scoped change.

final result: passed
