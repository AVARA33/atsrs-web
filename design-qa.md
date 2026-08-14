# ATSRS V533 Design QA

## Evidence

- Dark sharing source: `docs/qa/v533-privacy-brand/source-dark-sharing.png`.
- Light logo source: `docs/qa/v533-privacy-brand/source-light-logo.png`.
- Implementations: `implementation-dark-sharing.png`, `implementation-light-home.png`, and `implementation-light-login.png` in the same QA folder.
- Combined comparisons: `comparison-dark-sharing.png` and `comparison-light-logo.png`.
- Desktop implementation viewport: 1280 x 720 CSS px. Responsive check: 390 x 844 CSS px.
- Focused source regions were normalized to 1000 px width in the comparison images; implementation captures use 1x CSS density.

## Findings and iteration history

1. P2 before fix: the Dark Privacy & Sharing wrapper, sharing panel and analytics cards retained blue surfaces that were brighter than the approved near-black workspace palette.
   - Fix: outer surface `#050606`, panel surface `#0b0d0d`, inner cards `#111414`, shared line `#2a2f2d`; gradients and shadows removed.
   - Post-fix evidence: all three surface levels are distinct, neutral and visibly darker in the combined comparison.
2. P2 before fix: Light Home/Login did not use the supplied blue/black lockup.
   - Fix: the exact 1.35 MB supplied raster is used as the Light lockup source with no filter, drop-shadow or box-shadow. Multiply blending removes the white raster field against the Light canvas without introducing a black halo.
3. P3 follow-up: only the explicitly marked Dark Product Updates labels now use the selected lime `#b8ff19`.
   - `NEW · AI SCAN LIVE`, `NEW · AI CV LIVE`, and all `Available now` texts compute to `rgb(184, 255, 25)`.
   - Card titles remain neutral `rgb(244, 247, 251)`; development/planned statuses remain unchanged.

## Required fidelity surfaces

- Typography and copy: unchanged except the requested status-label colors.
- Spacing and layout: existing V526/V531 geometry is unchanged.
- Image quality: exact supplied Light logo asset; no generated or approximate asset.
- Responsive behavior: no horizontal overflow at desktop or 390 px.
- Theme behavior: Dark surface changes are scoped to Personal Privacy & Sharing; the logo replacement is scoped to Light Home/Login.

## Runtime checks

- Dark sharing fixture: passed, console errors 0.
- Light Home and Login: passed locally; logo has no filter or shadow.
- Product Updates Light/Dark toggle: passed; only marked live labels changed.
- Product Updates horizontal overflow: 0.
- Focused Node regression tests and Cloudflare build: passed.

final result: passed

---

# ATSRS V535 Product Updates Selected-Green QA

## Evidence

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-93966622-d8b1-4e04-b45a-c89eb053d503.png`.
- Browser-rendered implementation: `C:\Users\user\.codex\visualizations\2026\08\13\019ff9c2-6eb4-74b0-a872-5cdbf37a5016\atsrs-v535-qa\product-updates-v535-dark.png`.
- Combined comparison: `C:\Users\user\.codex\visualizations\2026\08\13\019ff9c2-6eb4-74b0-a872-5cdbf37a5016\atsrs-v535-qa\product-updates-v535-comparison.png`.
- Source pixels: 3439 x 1440. Implementation pixels and CSS viewport: 1264 x 839 at 1x density.
- State: authenticated-style Product Updates fixture, Dark mode; Light-mode theme-toggle regression also checked.

## Findings and comparison history

- No P0, P1 or P2 mismatch remains within the user-marked scope.
- First comparison passed: both `NEW · ... LIVE` labels and all three `AVAILABLE NOW` labels compute to `rgb(184, 255, 25)`, matching the selected Product Updates accent `#b8ff19`.
- `IN DEVELOPMENT`, `PLANNED`, card titles, descriptions and icon treatments remain unchanged.
- No corrective visual loop was required after the first browser capture.

## Required fidelity surfaces

- Fonts and typography: family, size, weight, spacing and capitalization are unchanged; only the requested foreground token changed.
- Spacing and layout rhythm: no geometry, padding, grid, radius or alignment changes.
- Colors and visual tokens: selected Dark labels use the same shared accent token as the active Product Updates navigation item. Light mode retains its approved blue status treatment.
- Image quality and asset fidelity: no image or icon assets were changed.
- Copy and content: no text changed.

## Runtime checks

- Primary interaction tested: Light/Dark toggle.
- Dark computed-color scope: 2 news labels and 3 available labels are `#b8ff19`; development/planned labels and six card titles are unaffected.
- Light computed-color scope: news and available labels remain blue.
- Browser console errors: 0.

final result: passed
