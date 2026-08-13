# ATSRS V513 Brand, Login and Loading Design QA

## Evidence

- Source visual truth:
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-a2b43b4e-f40c-4683-87d7-3371419f7e5a.png` (green lockup, 1536 × 1024)
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-af9594fd-8a30-498b-a6e6-685e7dc18f8f.png` (blue lockup, 1536 × 1024)
- Browser-rendered implementation:
  - `docs/qa/v513/login-light.png`
  - `docs/qa/v513/login-dark.png`
  - `docs/qa/v513/loading-light.png`
  - `docs/qa/v513/loading-dark.png`
  - `docs/qa/v513/loading-shine.png`
- Same-input focused comparisons:
  - `docs/qa/v513/comparison-login-dark.png`
  - `docs/qa/v513/comparison-loading-dark.png`
- Viewport: 1280 × 720 CSS px, device scale factor 1.
- Implementation captures: 1280 × 720 px.
- States: Login light, Login dark, Loading light, Loading dark, Loading shine in motion.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the ATSRS lettering and “Applicant Tracking System & Recruitment Solutions” line remain embedded in the supplied raster lockups, so their family, weight, spacing and proportions match the source. Existing Sign in/Sign up typography remains stable.
- Spacing and layout rhythm: the full lockup is centered in the existing compact Login card with a reserved aspect ratio, preventing image-load layout shift. The icon-only Loading mark is centered with no caption, spinner or secondary content.
- Colors and visual tokens: light mode selects the supplied blue lockup/mark; dark mode selects the supplied green lockup/mark. The dark/navy asset backgrounds merge with their loading canvases.
- Image quality and asset fidelity: production assets are deterministic crops and downscales of the supplied originals, not reconstructed graphics. Login assets retain the complete lockup; Loading assets retain only the left mark.
- Copy and content: the displayed company line is exactly “Applicant Tracking System & Recruitment Solutions”. Loading has no visible text.
- Accessibility and motion: Loading retains an accessible status label; the shimmer stops under `prefers-reduced-motion`. Back to Home remains keyboard-accessible with a 44px target.

## Comparison History

1. Initial P2: the first icon crop retained a thin part of the vertical divider from the full lockup.
   - Fix: tightened the mark crop before producing the light and dark Loading assets.
   - Post-fix evidence: `loading-light.png`, `loading-dark.png`, and `comparison-loading-dark.png` show a clean icon-only mark.
2. Initial P2: placing the full 1536 × 1024 source directly inside the Login slot made the lockup visually too small and transferred unnecessary image weight.
   - Fix: produced dedicated 1108 × 384 Login assets from the exact supplied lockups and reserved their aspect ratio in CSS.
   - Post-fix evidence: `login-light.png`, `login-dark.png`, and `comparison-login-dark.png`.

## Interaction and Runtime Checks

- Theme switch changed between the blue and green supplied assets.
- Back to Home returned to the public Home route.
- Home remained scrollable after returning from Login.
- Loading DOM contained no spinner and no visible text.
- Login and Loading horizontal overflow: 0.
- Browser console errors: 0 on Login/Home transition and Loading harness.

## Follow-up Polish

- No P3 item is required for this release.

final result: passed
