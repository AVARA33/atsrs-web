# Sage Ledger production design QA

## Scope and evidence

- Design source: `docs/audit/live-template-compare-20260808/02-template.png`
- Previous live implementation: `docs/audit/live-template-compare-20260808/01-real.png`
- Initial comparison: `docs/audit/live-template-compare-20260808/03-side-by-side.png`
- Corrected Corporate desktop: `docs/audit/live-template-compare-20260808/11-corrected-corporate-desktop-final.jpg`
- Final combined comparison: `docs/audit/live-template-compare-20260808/12-final-side-by-side.jpg`
- Corrected 390px Corporate mobile: `docs/audit/live-template-compare-20260808/10-mobile-corporate-final.jpg`
- Header-control reference: `docs/audit/header-controls-both-accounts-20260808/01-reference.png`
- Personal and Corporate focused comparison: `docs/audit/header-controls-both-accounts-20260808/04-focused-comparison.jpg`
- Corrected inset evidence: `docs/audit/text-overflow-20260808/04-corrected-desktop.png`, `05-corrected-mobile.png`

The source and implementation were compared in the same Chrome window at 1707 x 842. Focused checks covered the 112px navigation rail, 84px header, icon family, account controls, 48px readiness heading, readiness score, action column, 84px status band, register typography, borders, colors, and mobile bottom navigation.

## Findings and corrections

1. P1 - The prior production version applied only a partial CSS skin. Its sidebar remained 232px, navigation icons were absent, and the header controls overlapped. Fixed by implementing the selected V4 shell and loading the same Phosphor icon family locally.
2. P1 - Legacy ATSRS selectors overrode the selected background, button, and text colors. Fixed with a scoped final cascade lock using the V4 ivory, eucalyptus, border, text, muted, warning, and danger tokens.
3. P1 - The dashboard register read incorrect source columns, placing issue date and status in the wrong presentation columns. Fixed by mapping the existing real document fields to Document, Provider, Expiry, Status, and Action.
4. P2 - Production typography and dimensions did not match the template. Fixed: 112px rail, 84px header, 48px Georgia readiness heading, 66px readiness score, 56px action buttons, 44px header controls, and 230px Corporate action column.
5. P2 - Corporate mobile action text collided at 390px. Fixed with a two-column 56px action grid, 13px responsive labels, and constrained icon gaps.
6. P1 - The notification bell was restricted to Corporate accounts even though the selected header pattern applies to both workspaces. Fixed so notification, theme, and account controls remain visible in both Personal and Corporate, including the 390px header.
7. P1 - Corporate notification/request panels reset the dashboard content gutter to zero, and Product Updates lost its internal padding. Fixed with 40px desktop and 12px mobile activity gutters, restored hero/roadmap insets, larger notification-card padding, and defensive natural word wrapping.

## Verification

- Desktop viewport: 1707 x 842.
- Mobile viewport: 390 x 844.
- Horizontal overflow: 0px on reviewed desktop and mobile dashboards.
- Visible interactive controls below 44px on the reviewed mobile dashboard: 0.
- Local Personal and Corporate console errors: 0.
- JavaScript syntax check: passed.
- Regression suite: 50 passed, 0 failed.
- Login, authentication, loading behavior, and production user data were not changed.
- Template sample values and personnel rows were not copied into production; the implementation keeps existing ATSRS data and functionality.

No unresolved P0, P1, or P2 visual defect remains in the reviewed scope.

final result: passed
