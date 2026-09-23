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

- Automated CSS, cache-bust, localization and runtime tests: 20 passed.
- Production build: passed (`480` files generated).
- Live V6176 browser verification: passed in both dark and light themes.
- Companies: 30 cards loaded with deterministic `data-company-visual` and `data-company-tone`; dark artwork `.56`, light artwork `.48`.
- Recruiters: 30 cards loaded; light artwork `.38`.
- JobSearch: 30 cards loaded; light artwork `.52`.

## Result

Final result: passed. Card dimensions, controls and existing navigation behavior remained unchanged.
