# Companies Directory V6038 design QA

- Visual source of truth: `qa/company-directory-v6038-reference.png`
- Implementation render: `qa/company-directory-v6038-preview.png`
- Side-by-side comparison: `qa/company-directory-v6038-comparison.png`
- Viewport: 2000 × 790 CSS pixels
- State: dark theme, Companies route, first 30-result page

## Measured layout

- Sidebar: 140 px fixed shell.
- Hero: x=203.33, y=70, width=1718, height=445; target x≈205, y=70, width≈1718, height≈445.
- Employer network: x=959.33, y=70.67, width=961.33, height=443.67. The supplied raster is clipped at its original coordinate system, so all employer-logo and shield positions remain source-faithful.
- Filter toolbar: x=203.33, y=539, width=1718; controls begin at y=564. Target controls begin at approximately y=568.
- Cards: y=642, three equal 556 px columns with 25 px gaps. Target cards also begin at y≈642.
- Document width is 1985 px within the 2000 px viewport; no horizontal overflow is introduced.

## Findings

- P0: none. The route, controls, pagination and company data remain functional.
- P1: none. Hero geometry, content hierarchy, real employer logos, six-control filter row and three-column desktop card layout match the supplied frame.
- P2 resolved: the initial network pane was placed in a collapsed grid row because of a stale stylesheet response. The cache version was advanced and the hero now enforces a zero-gap 44/56 grid with a full-height right pane.
- Typography: H1 remains on one line at 59 px; body copy stays on two lines.
- Accessibility: both hero CTAs are native buttons; Hiring now exposes `aria-pressed`; focus-visible styling is explicit; pagination uses navigation semantics.
- Responsive behavior: cards move to two columns below 1440 px and one column below 980 px; filters collapse without horizontal scrolling; mobile CTAs stack.

## Verification

- `node tests/company-directory-v6038.test.cjs` passed.
- `node --check js/employers.js` passed.
- `npm run build:cloudflare` passed.
- Browser comparison was captured at the required 2000 × 790 viewport.

final result: passed
