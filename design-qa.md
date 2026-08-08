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
- Corrected light-mode green-control evidence: `docs/audit/light-green-contrast-20260808/01-before-dark-text.png`, `02-after-white-text.png`, `03-live-v441-white-text.png`
- Full Personal/Corporate green-control audit: `docs/audit/full-green-contrast-audit-20260808/01-corporate-documents-before.png`, `02-personal-documents-before.png`, `03-local-v442-after.png`, `04-live-personal-v442.png`, `06-live-corporate-v442-final.png`
- Sidebar source truth: `docs/audit/sidebar-v444/01-template-sidebar-source.png`
- Sidebar before correction: `docs/audit/sidebar-v444/02-live-v443-before.png`
- Sidebar implementation: `docs/audit/sidebar-v444/03-local-personal-v444-full.png`, `04-local-corporate-v444-full.png`
- Focused sidebar comparison: `docs/audit/sidebar-v444/06-sidebar-comparison.png`
- Live V444 evidence: `docs/audit/sidebar-v444/07-live-corporate-v444.png`, `08-live-personal-v444.png`

The source and implementation were compared in the same Chrome window at 1707 x 842. Focused checks covered the 112px navigation rail, 84px header, icon family, account controls, 48px readiness heading, readiness score, action column, 84px status band, register typography, borders, colors, and mobile bottom navigation.

The V444 sidebar pass used the selected 2048 x 1228 template capture as source truth. Its PII-free 134 x 1048 sidebar region was normalized to 134 x 900 and compared with the implementation's 134 x 900 focused crop at a 1440 x 900 CSS viewport and DPR 1. Corporate fit was also verified independently at 1280 x 720. The full implementation captures confirm the sidebar's placement in the application shell; the focused comparison was required because the source and QA fixture intentionally show different page content.

## Findings and corrections

1. P1 - The prior production version applied only a partial CSS skin. Its sidebar remained 232px, navigation icons were absent, and the header controls overlapped. Fixed by implementing the selected V4 shell and loading the same Phosphor icon family locally.
2. P1 - Legacy ATSRS selectors overrode the selected background, button, and text colors. Fixed with a scoped final cascade lock using the V4 ivory, eucalyptus, border, text, muted, warning, and danger tokens.
3. P1 - The dashboard register read incorrect source columns, placing issue date and status in the wrong presentation columns. Fixed by mapping the existing real document fields to Document, Provider, Expiry, Status, and Action.
4. P2 - Production typography and dimensions did not match the template. Fixed: 112px rail, 84px header, 48px Georgia readiness heading, 66px readiness score, 56px action buttons, 44px header controls, and 230px Corporate action column.
5. P2 - Corporate mobile action text collided at 390px. Fixed with a two-column 56px action grid, 13px responsive labels, and constrained icon gaps.
6. P1 - The notification bell was restricted to Corporate accounts even though the selected header pattern applies to both workspaces. Fixed so notification, theme, and account controls remain visible in both Personal and Corporate, including the 390px header.
7. P1 - Corporate notification/request panels reset the dashboard content gutter to zero, and Product Updates lost its internal padding. Fixed with 40px desktop and 12px mobile activity gutters, restored hero/roadmap insets, larger notification-card padding, and defensive natural word wrapping.
8. P1 - Light mode inherited Chromium's dark `-webkit-text-fill-color` even when solid sage controls declared white text. Fixed by locking both the foreground and text-fill color to white for sage action controls and the account avatar, while excluding the ivory header controls.
9. P1 - A full light-mode route audit found the four Documents register sort controls still using dark Chromium text fill on sage in both workspaces. Fixed by explicitly locking the sort labels and both arrow states to white without changing the table layout or behavior.
10. P1 - The Personal sidebar inherited 94px navigation rows and `overflow-y:auto`, producing a 987px scroll area inside a 900px rail and hiding the lower navigation. Fixed by making the desktop rail a non-scrolling flex column, reducing Personal and Corporate row heights, anchoring Product Updates and Privacy to the bottom, and adding 760px/580px height adaptations that retain a minimum 44px target.

## Verification

- Desktop viewport: 1707 x 842.
- Mobile viewport: 390 x 844.
- Horizontal overflow: 0px on reviewed desktop and mobile dashboards.
- Visible interactive controls below 44px on the reviewed mobile dashboard: 0.
- Local Personal and Corporate console errors: 0.
- JavaScript syntax check: passed.
- V444 Personal sidebar: 900px client height, 900px scroll height, internal scroll false, minimum visible button 54px.
- V444 Corporate sidebar: 720px client height, 720px scroll height, internal scroll false, minimum visible button 46px.
- Live V444 Personal and Corporate at 1440 x 900: 900px client height, 900px scroll height, internal scroll false, minimum visible button 54px, console errors 0.
- Required fidelity surfaces: existing Aptos/Georgia typography retained; Sage tokens, borders and 112px rail retained; local Phosphor icon assets retained; labels and ordering match the current ATSRS navigation contract; no raster or placeholder assets introduced.
- Regression suite: 53 passed, 0 failed.
- Login, authentication, loading behavior, and production user data were not changed.
- Template sample values and personnel rows were not copied into production; the implementation keeps existing ATSRS data and functionality.

No unresolved P0, P1, or P2 visual defect remains in the reviewed scope.

## V450 compact navigation and document-header QA

- Selected source captures: `C:/Users/user/AppData/Local/Temp/codex-clipboard-ee3c38a0-cb5f-4a38-abc8-d6f68f937138.png` and `C:/Users/user/AppData/Local/Temp/codex-clipboard-36b8d3b0-a57a-45f3-b2ef-553d5423f065.png`.
- Implementation capture: `tests/fixtures/compact-sidebar-document-header-harness.html?v=450`, reviewed at 1600 x 900 and 2048 x 1080 in the in-app browser.
- P1 corrected: Product Updates contained the correct Phosphor sparkle icon, but its 22px icon, 8px gap, and two-line 30px label exceeded the 54px utility row and clipped the icon. The final 4px gap and one-line 12px label keep the icon fully inside the row.
- P1 corrected: a delayed legacy language pass replaced the decorated Product Updates button with text after initial render. A scoped navigation observer now restores the real Phosphor icon and label only when that legacy rewrite removes the icon.
- P2 corrected: the document-register header was 75px high and the Uploaded label occupied two lines. The final header is 58.33px, every heading label is one line, and sortable controls retain their 44px touch target.
- Horizontal overflow at 1600px and 2048px: 0px.
- Product Updates icon offset inside its row: 8px from the top; label height: 12px.
- Regression suite: 59 passed, 0 failed.
- No authentication, loading, persistence, or production-user data behavior changed.

No unresolved P0, P1, or P2 visual defect remains in the V450 scope.

final result: passed
