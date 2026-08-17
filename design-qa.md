# ATSRS V562 Product Updates Premium Ordering QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-d259e417-695b-43a1-a9c1-dd4ec4a51418.png`
- Rendered implementation: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-product-updates-premium-first.png`
- Combined comparison: `C:\Users\user\Documents\GitHub\atsrs-web\.codex-v562-product-updates-premium-order-comparison.png`
- Verification state: Product Updates capability grid in light and dark themes.

## Full-view comparison evidence

The supplied Product Updates screenshot establishes the existing three-column roadmap grid and Premium marker treatment. The implementation preserves that layout, typography, card sizes, status badges and spacing while grouping every Premium capability at the beginning of the capability list.

## Focused ordering evidence

The first four capabilities are now, in order:

1. WhatsApp Expiry Alerts — Premium, In development
2. AI Document Scan — Premium, Available now
3. QR Phone Upload — Premium, Available now
4. ATSRS Profile CV — Premium, Available now

Standard capabilities begin only after these four cards. At the desktop three-column breakpoint, the first row contains three Premium cards and the second row begins with the fourth Premium card.

## Required fidelity surfaces

- Layout: existing three-column desktop grid preserved.
- Typography and spacing: unchanged from the established Product Updates design.
- Light and dark colors: existing theme-specific tokens preserved.
- Status honesty: In development and Available now badges remain unchanged.
- Premium treatment: existing star marker and Premium label retained.
- Responsive behavior: DOM order remains Premium-first at every breakpoint.

## Runtime and regression checks

- First four DOM cards are Premium: passed.
- WhatsApp remains first so in-development work stays prominent: passed.
- ATSRS Profile CV moved before every standard capability: passed.
- Horizontal overflow at verified desktop viewport: 0 px.
- Product Updates capability inventory tests: 6 passed.
- Product Updates Premium marker test: passed.
- `git diff --check`: passed.

## Final result

final result: passed

---

# ATSRS V58134 Jobs Circular Detail Control QA

**Source visual truth**

- Path: `C:\Users\user\Documents\GitHub\atsrs-jobs-title-search\.evidence-job-control-58134\reference-production-dark.png`
- Source pixels: 2048 × 1224.
- State: ATSRS production Jobs cards, dark theme, collapsed controls.

**Rendered implementation**

- Primary path: `C:\Users\user\Documents\GitHub\atsrs-jobs-title-search\.evidence-job-control-58134\1920-dark-collapsed.png`
- Additional states: `1920-dark-expanded.png`, `1920-light-collapsed.png`, `1920-light-expanded.png`, `390-dark.png`, `390-light.png` in the same evidence folder.
- Implementation pixels / CSS viewport: 1920 × 1080 at device scale factor 1 for desktop; 390 × 844 at device scale factor 1 for mobile.
- Density normalization: browser captures and CSS viewport are 1:1. The 2048 × 1224 source was inspected at native density and scaled only for the full-view board; the focused comparison uses native-pixel positioning for both images.
- Combined comparison: `C:\Users\user\Documents\GitHub\atsrs-jobs-title-search\.evidence-job-control-58134\design-comparison.png`.

**Findings**

- No actionable P0, P1 or P2 mismatch remains in the scoped control correction.
- The source square/checkbox-like control is replaced by one 28px circular Phosphor arrows-out toggle at 8px top/right. Expanded state moves that same semantic button into the detail panel and changes it to arrows-in.
- Dark treatment is near-black with a neutral border and light icon. Light treatment is #2563EB with white icon. No lime utility-control background is present.
- Short, medium, long and very long title fixtures have zero control overlap; the first-line title/control centre delta is 3.67px and control position is identical.
- 390px dark/light captures show no horizontal overflow and preserve the 28px circle, 42px title reserve and 8px top/right placement.

**Required fidelity surfaces**

- Fonts and typography: unchanged from the ATSRS Jobs card. Title size, weight, line height, colour and wrapping remain unchanged; only a 42px collision reserve was added.
- Spacing and layout rhythm: card dimensions, grid, pagination, internal scroll and content spacing remain unchanged. The scoped control is 28px at top/right 8px; the old 44px rectangular visual region is removed.
- Colours and visual tokens: dark #111214 / #34383A / #F8FAFC; light #2563EB / #1D4ED8 / #FFFFFF. Hover, active and compact circular focus states are theme-specific.
- Image quality and asset fidelity: Phosphor `ph-arrows-out` and `ph-arrows-in` library icons are used. No CSS-drawn icon, inline SVG, emoji or placeholder is used.
- Copy and content: vacancy data and card copy are unchanged. Labels are exactly `Expand job details` and `Minimize job details`.

**Interaction evidence**

- Mouse click, Enter and Space toggle the same semantic button.
- Backdrop click and Escape do not minimize the expanded detail; only the inward-arrow button does.
- Focus returns to the original card position after minimize; body scroll lock clears.
- Focus-visible computed as a 2px compact circular ring; hover computed to the restrained dark hover surface.
- Local console errors: 0.

**Comparison history**

- Pass 1: combined local full-view and focused source/implementation comparison found no P0/P1/P2 issue in the isolated Jobs fixture.
- Production pass 1: P1 theme-colour mismatch found. The full-app `shell-polish.css` neutral-button selector overrode the circle surface and foreground with `!important`, leaving the live control transparent.
- Fix: exclude only `.job-detail-toggle` from the generic neutral-button selector and bump the shell stylesheet cache marker. The Jobs component remains the sole owner of this control's dark/light visual states.
- Production pass 2: dark/light collapsed and expanded controls match the component palette, use outward/inward Phosphor arrows, remain one control per record, and preserve the deliberate-close lifecycle.
- Production pass 3: the full workspace dark touch-target standard expanded the visible mobile circle to 44px. A scoped, higher-specificity geometry rule now keeps the visible circle at 28px while its transparent pseudo-element preserves the 44px effective hit area.
- Final live evidence: cache `58135`; 390px dark/light both compute 28×28px, page overflow is 0px, 30 controls render for the 30 visible records, mobile expand/minimize works, focus returns, and the body-lock class clears. Live console errors: 0.

**Implementation Checklist**

- [x] Remove legacy square/minus CSS and icons.
- [x] Use one semantic button per job across collapsed and expanded states.
- [x] Verify 1920 dark/light collapsed/expanded.
- [x] Verify 390 dark/light and zero overflow.
- [x] Verify title collision cases, keyboard, hover, focus and deliberate-close contract.

**Follow-up Polish**

- None required for the scoped correction.

final result: passed
