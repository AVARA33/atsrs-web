# ATSRS V531 Product Updates Design QA

## Evidence

- Source visual truth: user-supplied Dark Product Updates screenshot `C:\Users\user\AppData\Local\Temp\codex-clipboard-285d3e16-3041-46fa-a1e7-dff6867aada4.png`.
- Browser-rendered before states: `docs/qa/v531-product-updates-audit/01-light-before.png` and `02-dark-before.png`.
- Browser-rendered implementation: `docs/qa/v531-product-updates-audit/03-light-after.png` and `04-dark-after.png`.
- Viewport/state: 2294 x 735 CSS px, Product Updates, Light and Dark.
- Density normalization: captures use the same browser, viewport, page structure and content. The supplied screenshot was used to validate the reported Dark hierarchy; the current-run before/after captures provide the same-state implementation comparison.
- Focused region comparison: the six-card grid is large enough for direct icon, title and status inspection, so no additional crop was required.

## Findings and comparison history

1. P2 before fix: featured cards placed icons and titles 16px below adjacent cards because only featured cards had a `roadmap-news` element.
   - Fix: explicit four-row card grid with stable row assignments for news, icon, title and body copy.
   - Post-fix evidence: icon and title top positions are identical across all three cards in each row in both themes.
2. P2 before fix: Dark page title, hero title, roadmap title and six card titles all used lime, weakening hierarchy and producing glare.
   - Fix: ordinary Dark headings now use `#f4f7fb`; green remains semantic.
   - Post-fix evidence: all six Dark card titles compute to `rgb(244,247,251)`.
3. P2 before fix: Dark icon chips added a third broad green layer.
   - Fix: Dark icon chips use muted blue `#bfdbfe` on a restrained blue surface.
   - Post-fix evidence: all six icon labels compute to `rgb(191,219,254)`.

## Required fidelity surfaces

- Fonts and typography: existing family, sizes, weights, line heights and copy are unchanged; only Dark colour hierarchy changed.
- Spacing and layout rhythm: card padding, radius and grid size remain stable; icon/title rows are now symmetric.
- Colors and visual tokens: Light stays unchanged; Dark ordinary headings are neutral while green is reserved for semantic live/available states.
- Image quality and asset fidelity: no raster, logo or icon asset changed. Existing text icon chips retain their product meaning and geometry.
- Copy and content: no Product Updates wording or status changed.

## Runtime checks

- Light/Dark toggle: passed.
- Six-card alignment: passed in both themes.
- Page-level horizontal overflow: 0.
- No navigation, CTA or data behavior changed.

final result: passed
