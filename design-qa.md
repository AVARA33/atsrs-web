# V437 shell polish design QA

## Comparison target

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-048e6eb7-66e4-4625-a394-9cfc7407e08d.png` (application crop `537,235–2024,1293`)
- Rendered implementation: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\implementation-corrected-sidebar-1487x1058.png`
- Full-view comparison: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\comparison-corrected-sidebar-full.jpg`
- Focused comparison: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\comparison-corrected-sidebar-focused.jpg`
- Final header/full-Personal evidence: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\implementation-borderless-notification-1280x720.png`
- Dark switch evidence: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\implementation-dark-moon-1280x720.png`
- Mobile evidence: `C:\Users\user\.codex\visualizations\2026\08\07\019fddc9-cc71-7921-bd12-341b1219ed85\v437-shell-polish\implementation-mobile-390x844.png`

The source is the user's exact sidebar reference. Its narrow vertical icon-over-label structure and icon meanings are the target; typography and non-sidebar page structure remain authoritative. The signed-in shell now uses neutral and sage interaction surfaces instead of blue-filled controls.

## Viewport and state

- Desktop CSS viewport: `1487 x 1058`, device scale factor `1`.
- Source application crop: `1487 x 1058` pixels, used at native size with no density normalization.
- Implementation pixels: `1487 x 1058`.
- State: Personal workspace, Documents route, light theme, authenticated application shell.
- Additional states: dark/light switch, authenticated notification shortcut, unauthenticated login, and `390 x 844` mobile width.

## Evidence and findings

- Full view: no horizontal page overflow. The Documents register headings remain on one line and its table uses an internal horizontal scroller at narrow widths.
- Focused icons: Dashboard, Documents, References, Profile, Product Updates and Privacy use the same Phosphor meanings shown in the source: squares, file, file-text, user-circle, bell and lock.
- Focused controls: the light/dark control has a `42 x 24` visual track inside a `44 x 44` touch target. Both sun and moon remain visible. The notification control keeps the same `44 x 44` hit area, while its visible bell is `24 x 24` with no border, fill, radius or shadow; it appears only in the signed-in app shell.
- Dark switch state: the `16 x 16` moon is centered over the `18 x 18` white thumb and renders at `rgb(15, 23, 42)`, so it stays visibly black in dark mode.
- Fonts and typography: existing V436 font family, weights and sizes are unchanged. Table headings use `white-space: nowrap`, normal wrapping and `word-break: keep-all`; measured header height is about `56px`.
- Spacing and layout rhythm: the desktop sidebar alone is now a `112px` rail. Each item is `64px` high with the icon above a centered label. Dashboard remains above Documents as previously approved. Product Updates and Privacy remain anchored below the utility divider. Page/card spacing outside the sidebar is unchanged.
- Colors and visual tokens: authenticated controls use neutral or sage surfaces; no inspected box retains a blue fill. The active sidebar item is transparent and is identified only by a `3px` sage left rail. Icon and bell foregrounds inherit the shell tokens; the compact switch reuses the current light/dark colors. Login and loading are unchanged.
- Image and asset fidelity: the historical Phosphor WOFF2 and regular stylesheet were restored exactly. No handcrafted SVG, CSS-drawn icon, emoji or placeholder asset is used.
- Copy and content: existing page labels and app content are unchanged. The runtime preserves translated labels while replacing only icon nodes.
- Responsiveness and accessibility: at `390 x 844`, root horizontal overflow is `0`; the register scrolls internally (`325px` client / `1040px` content). A Corporate rail with all ten visible entries also fits at `1366 x 768` with no sidebar scrolling or clipping. Persistent controls keep `44px` targets and focus-visible treatment.
- Interaction checks: theme switch settled correctly in light and dark states; bell navigates/scrolls to the existing notification panel; login keeps the bell hidden; login has `0` horizontal and vertical overflow.
- Console errors: `0` on the rendered app harness and login page.

## Comparison history

1. The first implementation retained the old wide horizontal sidebar layout. The user identified this as a P1 interpretation mismatch.
2. The sidebar was changed to the exact `112px` vertical rail pattern, with icons above labels and no palette changes.
3. A focused pass then found Product Updates still ordered above the main navigation because of an inherited legacy `order:-2`; it was reset below the utility divider.
4. The icon meanings were aligned to the supplied reference and the implementation was recaptured at the source's exact `1487 x 1058` content size. No P0, P1 or P2 findings remain in the requested scope.

## Implementation checklist

- [x] Keep Documents headings on one line.
- [x] Show the desktop sidebar as a `112px` vertical rail with icons above centered labels.
- [x] Match the supplied Phosphor icon meanings without changing colors.
- [x] Reduce the visual light/dark switch while retaining a `44px` target.
- [x] Show the notification bell only on signed-in pages.
- [x] Remove the notification tile so only the switcher-sized bell remains visible.
- [x] Keep the dark-mode moon black and visible inside the white thumb.
- [x] Remove blue-filled authenticated controls in Personal and Corporate pages.
- [x] Remove the active sidebar box; retain only the sage left selection rail.
- [x] Verify desktop, `390px`, light, dark, login, focus target size and console output.

final result: passed

## V438 production shell regression audit

Current-run evidence:

- `01-personal-initial.png`: production Personal state exposed Corporate-only navigation, hid the header notification button, and reused the bell for Product Updates.
- `02-personal-dashboard-selected.png`: navigation changed pages correctly, but the active text state was not applied because it depended on a missing body marker.
- `03-corporate-dashboard.png`: Corporate restored the header bell after a workspace switch, proving the first-load body-marker dependency.
- `04-v438-local-personal.png`: Personal shows exactly Dashboard, Documents, References & CV, Profile, Security, Product Updates and Privacy. Header bell is separate and Product Updates uses the sparkle icon.
- `05-v438-local-corporate.png`: Corporate shows exactly Dashboard, Candidates, Personnel, Company Credentials, Compliance, Reports, Company, Product Updates and Privacy.

V438 acceptance:

- [x] Notification button is visible in the header on first authenticated render and after workspace switches.
- [x] Product Updates uses `ph-sparkle`; only notification uses `ph-bell`.
- [x] Personal and Corporate navigation visibility is explicit and does not depend on `.hidden` surviving the rail layout rule.
- [x] Active navigation has transparent fill, sage text and a `3px` left rail in both modes.
- [x] Local Personal and Corporate render with zero root horizontal overflow.
- [x] V439 keeps exactly one active navigation item when Corporate Company Credentials opens a legacy documents/references section.
- [x] V440 restores Product Updates and the remaining navigation icon/label wrappers in a microtask, before the browser can paint a transient legacy label.
- [x] V441 removes colored fills from ordinary signed-in buttons and bounds the initial session loading lock to a five-second real deadline, including background-tab recovery.
- [x] V442 adds an inline five-second hard unlock before the deferred application bundle, so a stalled dependency cannot leave the loading screen visible indefinitely.
- [x] V443 removes the navigation microtask observer loop and decorates icons synchronously after the actual language/render/page writers, preventing both flicker and main-thread starvation.
- [x] V444 guards legacy Corporate body observers so signed-in Personal startup cannot emit a null-target MutationObserver console error.
