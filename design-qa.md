**Findings**

- No actionable P0/P1/P2 mismatch remains. The Light and Dark lockups now occupy identical visible artwork bounds at the working alpha threshold, and their Home/Login layout boxes do not move during theme changes.

**Evidence**

- Source visual truth: `docs/qa/v538-login-dark-logo.png`
- Implementation: `docs/qa/v538-login-light-logo.png`
- Combined focused comparison: `docs/qa/v538-logo-size-comparison.jpg`
- Desktop viewport: 1280 x 720 CSS px, device scale factor 1. Both Login logo boxes measured 420 x 145.552 px at x=430, y=228.
- Mobile viewport: 390 x 844 CSS px, device scale factor 1. Both Login logo boxes measured 330 x 114.365 px at x=30, y=244.
- Home desktop: both logo boxes measured 217.594 x 75.406 px at x=64, y=10.
- Asset canvas: 1108 x 384 px for both lockups. Perceived artwork bounds at alpha >= 64 are identical: `(17, 27, 1091, 384)`.
- Loading marks remain identical 396 x 400 px canvases in both themes.
- State: Light/Dark theme toggle on public Home and Login.
- Console errors: 0.

**Required Fidelity Surfaces**

- Fonts and typography: unchanged.
- Spacing and layout rhythm: theme-toggle position and logo boxes are identical; the legacy Dark-only mobile padding override is neutralized.
- Colors and visual tokens: unchanged; green remains Dark and blue/graphite remains Light.
- Image quality and asset fidelity: approved raster artwork retained; only transparent padding/visual bounds were normalized.
- Copy and content: unchanged.

**Comparison History**

- Earlier P2: Light PNG contained more transparent padding, producing a visible size jump. Fixed by normalizing perceived artwork bounds to the Dark lockup.
- Earlier P2: a higher-specificity mobile rule added padding only in Dark mode, shrinking and shifting the Login logo at 390px. Fixed by applying the unboxed auth-card rule at matching specificity.
- Post-fix evidence: exact desktop, Home, and 390px layout-box parity; exact perceived asset bounds; no console errors.

**Implementation Checklist**

- [x] Normalize Light artwork bounds to Dark reference.
- [x] Remove Dark-only mobile auth-card padding conflict.
- [x] Verify Home and Login in both themes.
- [x] Verify desktop and 390px breakpoints.
- [x] Run focused regression tests.

**Follow-up Polish**

- None required for this scoped change.

final result: passed
