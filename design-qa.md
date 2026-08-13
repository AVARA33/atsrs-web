# ATSRS V514 Home and Login Branding Design QA

## Evidence

- Source visual truth:
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-a2b43b4e-f40c-4683-87d7-3371419f7e5a.png` (green lockup, 1536 x 1024 px)
  - `C:\Users\user\AppData\Local\Temp\codex-clipboard-af9594fd-8a30-498b-a6e6-685e7dc18f8f.png` (blue lockup, 1536 x 1024 px)
- Browser-rendered implementation:
  - `docs/qa/v514/home-light-desktop.png`
  - `docs/qa/v514/home-dark-desktop.png`
  - `docs/qa/v514/login-light-desktop.png`
  - `docs/qa/v514/login-dark-desktop.png`
  - `docs/qa/v514/home-dark-390.png`
  - `docs/qa/v514/login-light-390.png`
  - `docs/qa/v514/login-dark-390.png`
- Same-input comparison evidence:
  - `docs/qa/v514/comparison-home-light-full.jpg`
  - `docs/qa/v514/comparison-login-light-full.jpg`
  - `docs/qa/v514/comparison-login-light-focus.jpg`
- Desktop viewport: 1280 x 720 CSS px, device scale factor 1; screenshots are 1280 x 720 px.
- Mobile viewport: 390 x 844 CSS px, device scale factor 1; screenshots are 390 x 844 px.
- States: Home light/dark, Login light/dark, desktop/mobile.
- Source images describe the brand lockup rather than a complete page layout. Page placement was therefore checked against the user's explicit request: full lockup at Home top-left, no Login card, and no black rectangular logo matte.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the ATSRS lettering and “Applicant Tracking System & Recruitment Solutions” line remain part of the supplied raster lockup, preserving the supplied family, proportions, weight and spacing. Existing Home and Login UI typography remains unchanged.
- Spacing and layout rhythm: Home uses a compact 188–218 px desktop lockup and a 168 px mobile lockup without increasing header height. Login keeps the existing centered alignment after removing card padding, border, radius and shadow.
- Colors and visual tokens: light mode uses the blue lockup with formerly white neutral portions converted to ATSRS navy for contrast; dark mode uses the supplied green lockup. The page palettes themselves are unchanged.
- Image quality and asset fidelity: both production lockups are derived from the supplied originals by a reproducible matte-removal script. They retain the supplied artwork, have transparent backgrounds, avoid a black rectangular box and show no clipping at desktop or 390 px.
- Copy and content: the visible company line is exactly “Applicant Tracking System & Recruitment Solutions”. No Login labels or controls were removed.
- Accessibility and responsiveness: Home logo links to the top of the landing page with an accessible ATSRS label. Login still has a keyboard-accessible Back to Home control, one-viewport layout and zero horizontal overflow.

## Comparison History

1. Initial P2: the supplied blue lockup used white lettering intended for a dark matte, making neutral logo portions too weak on the light page after transparency was introduced.
   - Fix: recolored only neutral white/gray logo pixels to ATSRS navy while preserving the supplied blue gradients.
   - Post-fix evidence: `comparison-home-light-full.jpg` and `comparison-login-light-focus.jpg` show readable brand text on the light background.
2. Initial P2: a direct crop retained the source image's dark rectangular matte around the full lockup.
   - Fix: added deterministic row-aware matte removal and exported transparent PNG lockups.
   - Post-fix evidence: `login-light-desktop.png`, `login-dark-desktop.png`, and `comparison-login-light-focus.jpg` show the artwork directly on the page with no enclosing black box.

## Interaction and Runtime Checks

- Home to Login opens the Login route.
- Back to Home returns to the public landing page.
- Home remains vertically scrollable after returning from Login.
- Desktop and 390 px page-level horizontal overflow: 0.
- Login card computed background: transparent; border and shadow: none.
- Fresh Home and fresh Login browser console errors: 0.

## Follow-up Polish

- No P3 item is required for this release.

final result: passed
