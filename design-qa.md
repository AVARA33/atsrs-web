# ATSRS V516 Light-Mode 3D Logo Design QA

## Evidence

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-a2b43b4e-f40c-4683-87d7-3371419f7e5a.png` (1536 x 1024 px dark-mode green lockup used for 3D depth, edge light, ground glow and metallic treatment).
- Browser-rendered implementation:
  - `docs/qa/v516/home-light-desktop.png` (984 x 554 px rendered browser capture)
  - `docs/qa/v516/login-light-desktop.png` (984 x 554 px rendered browser capture)
  - `docs/qa/v516/login-light-390.png` (300 x 649 px browser-scaled 390 x 844 responsive state)
- Asset-on-canvas evidence: `docs/qa/v516/asset-on-light.png` (1108 x 384 px).
- Same-input comparison: `docs/qa/v516/comparison-dark-source-vs-light-login.jpg`.
- Device scale factor 1. The in-app preview surface scaled the requested responsive viewport; layout and overflow were judged from CSS metrics returned by the browser.
- States: public Home light and Login light on desktop and narrow mobile.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the supplied ATSRS lettering and company line remain raster artwork. Only the first three neutral letters, ATS, are mapped to near-black graphite in light mode. RS retains its blue gradient.
- Spacing and layout rhythm: Home and Login positions and dimensions remain unchanged from V514/V515. The Login card remains removed and the lockup stays centered.
- Colors and visual tokens: light mode uses graphite ATS, blue-gradient RS and blue/cyan illustration. Dark mode remains the existing green supplied lockup and is untouched.
- Image quality and asset fidelity: the light asset copies the dark reference's 3D vocabulary—bright edge light, inner blue depth, specular cyan highlights, ground glow and close halo—without restoring the black rectangular matte. The glow is baked only from colored artwork pixels, so black ATS letters are not surrounded by an artificial blue text shadow.
- Copy and content: “Applicant Tracking System & Recruitment Solutions” remains present and readable. No UI copy changed.
- Responsiveness and accessibility: Home stays scrollable; Login fits its mobile viewport; page-level horizontal overflow is 0; the Back to Home control is unchanged.

## Comparison History

1. P2 V515: ATS was recolored blue even though the user expected the first three letters to remain black.
   - Fix: restrict neutral recoloring to the ATS wordmark region and map it to near-black graphite.
2. P2 V515: global CSS drop-shadow did not recreate the supplied 3D treatment and also affected lettering.
   - Fix: preserve and enhance source-blue highlights, then derive close cyan and wide blue glow masks only from colored artwork pixels inside the transparent PNG.
3. Post-fix evidence: `asset-on-light.png`, `home-light-desktop.png`, `login-light-desktop.png`, `login-light-390.png`, and `comparison-dark-source-vs-light-login.jpg` show black ATS plus source-like blue 3D depth and glow.

## Interaction and Runtime Checks

- Home and Login light routes render build V516.
- Login card computed background remains transparent.
- Home remains vertically scrollable.
- Desktop and narrow mobile page-level horizontal overflow: 0.
- Fresh Login browser console errors: 0.
- Dark-mode green asset and its selectors were not changed.

## Follow-up Polish

- No P3 item is required for this release.

final result: passed
