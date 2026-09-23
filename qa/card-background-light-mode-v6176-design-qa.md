# Card background light mode — V6176 design QA

## Scope

- Recruiter Directory, JobSearch and Companies cards.
- Preserve layout, card dimensions, typography, data, controls and behavior.

## Visual changes

- JobSearch dark cards now use a profession-coloured surface beneath their existing full-card artwork.
- JobSearch light cards use pale profession surfaces with full-cover artwork at `.52` opacity.
- Recruiter light cards use pale versions of the existing green/cyan/purple/red rhythm with full-cover artwork at `.38` opacity.
- Company cards use deterministic industry artwork and green/cyan/purple/red/amber surfaces. Unknown industries use a professional network fallback rather than an empty card.
- Company light cards retain full-cover artwork at `.48` opacity over a pale matching surface.
- White overlays remain strongest under text and become lighter toward the artwork side.

## Verification

- Automated CSS, cache-bust, localization and runtime tests: pending.
- Production build: pending.
- Live dark/light browser capture: pending.

## Result

Final result: pending visual verification.
