# ATSRS Pricing Header Brand QA — V539

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-0f48ff82-e0e1-42f0-9c69-51dae875bfe0.png` (3439 × 1368) plus the existing Home header lockup component and approved brand assets.
- Implementations: `tests/artifacts/pricing-brand-v539/pricing-dark-desktop.png` and `tests/artifacts/pricing-brand-v539/pricing-light-desktop.png` (1265 × 712 each).
- Desktop viewport: 1265 × 712 CSS px, device scale factor 1.
- Mobile viewport: requested 390 × 844; browser content viewport measured 375 CSS px after browser chrome.
- States: Pricing page, dark and light themes, no hover state.

## Full-view comparison evidence

The Pricing header now uses the same Home lockup selector and raster sources instead of the previous text-only wordmark. Dark renders `atsrs-lockup-green-transparent.png`; light renders `atsrs-lockup-light-transparent.png`. Header navigation, hero layout, cards, and page spacing remain unchanged.

## Focused region comparison evidence

- Desktop dark logo box: 217.59 × 75.41 CSS px.
- Desktop light logo box: 217.59 × 75.41 CSS px.
- Mobile dark logo box: 168 × 58.22 CSS px.
- Mobile light logo box: 168 × 58.22 CSS px.
- Both themes use `background-size: contain`, transparent backgrounds, and visible overflow; the TM mark is not clipped.
- Mobile document width equals viewport width (375 px), so the change introduces no horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: unchanged outside the raster lockup; the logo retains its approved embedded typography.
- Spacing and layout rhythm: Home dimensions are reused exactly and remain identical between themes.
- Colors and visual tokens: dark uses the approved green lockup; light uses the approved blue/black lockup.
- Image quality and asset fidelity: original transparent brand PNGs are reused without stretching, CSS reconstruction, shadow, or masking.
- Copy and content: accessible label expands ATSRS as “Applicant Tracking System & Recruitment Solutions”; visible Pricing copy is unchanged.

## Findings

No actionable P0, P1, or P2 mismatch remains.

## Comparison history

- Initial state: Pricing displayed a simple text-only ATSRS wordmark and subtitle, visually inconsistent with Home.
- Fix: replaced it with the shared `atsrs-home-lockup` component and loaded its approved dark/light brand styles.
- Post-fix evidence: identical measured boxes in both themes, correct source files, no clipping, no horizontal overflow, and zero local console errors.

## Interaction checks

- Theme switch updates the logo source without changing its dimensions.
- Home, Log in, and Create Free Account links remain present and accessible.
- Local browser console errors: 0.

final result: passed
