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

## V489 Personal phone-field design QA

- Source: `C:/Users/user/AppData/Local/Temp/codex-clipboard-cacb899d-2466-419c-8e20-010ed0d8c989.png`.
- Dark implementation: `C:/Users/user/.codex/visualizations/2026/08/07/019fddc9-cc71-7921-bd12-341b1219ed85/v489-phone-field/implementation-dark.png`.
- Open-menu implementation: `C:/Users/user/.codex/visualizations/2026/08/07/019fddc9-cc71-7921-bd12-341b1219ed85/v489-phone-field/implementation-dropdown.png`.
- Light implementation: `C:/Users/user/.codex/visualizations/2026/08/07/019fddc9-cc71-7921-bd12-341b1219ed85/v489-phone-field/implementation-light.png`.
- The duplicate CSS-drawn caret was removed; the component now shows only the Phosphor caret.
- The calling-code segment is compact, both inputs retain one shared rounded boundary, and the dropdown opens without a green focus ring.
- Dark and light modes preserve the existing ATSRS palette and the calling-code filtering behavior is unchanged.

final result: passed

## V455 public theme-switch design QA

### Visual sources and implementation evidence

- User location reference: `C:/Users/user/AppData/Local/Temp/codex-clipboard-36351a57-24d0-4273-b0ac-0c3b07956de0.png`
- Existing ATSRS login switch source: `docs/audit/public-switch-v455/source-login-switch.png`
- Public landing implementation: `docs/audit/public-switch-v455/implementation-light.png`
- Focused public switch: `docs/audit/public-switch-v455/implementation-public-switch.png`
- Same-size focused comparison: `docs/audit/public-switch-v455/comparison-switch-focused.png`

### Viewport and state

- Browser-rendered implementation: `1265 x 712` pixels at CSS density `1`.
- Component comparison: source and implementation were each captured in a `60 x 52` pixel crop around a `44 x 44` touch target.
- State: public landing header, light theme; dark mode was also exercised interactively.

### Findings

- Fonts and typography: header copy, navigation, CTA type and branding remain unchanged.
- Spacing and layout rhythm: the new control occupies the same `44 x 44` touch target as Login; its visible track is centered at `42 x 24`. Header alignment and surrounding action spacing remain stable.
- Colors and visual tokens: the switch reuses the existing ATSRS light/dark track, thumb and icon colors instead of introducing a new control palette.
- Image quality and asset fidelity: the existing Phosphor sun/moon icons are used; no new raster or approximate icon asset was introduced.
- Copy and content: navigation and CTA copy are unchanged. Accessible labels update between “Switch to dark mode” and “Switch to light mode”.
- Interaction: light-to-dark and dark-to-light transitions both work; `aria-checked` changes with the theme.
- Responsive/accessibility: target size is `44 x 44`, root horizontal overflow is `0`, keyboard focus remains visible, and console errors are `0`.

### Comparison history

1. The public header used a separate circular icon button while Login and signed-in pages used a pill switch.
2. The first V455 implementation matched the `42 x 24` track but used a `50 x 44` outer target.
3. The outer target was corrected to the exact Login measurement of `44 x 44` and recaptured.
4. The final focused source/implementation comparison shows the same component geometry with no actionable P0, P1 or P2 mismatch.

final result: passed

## V450 public product landing and brand-motion QA

### Visual sources and implementation evidence

- Selected Product Design direction: `docs/design/public-landing-option-3-source.png`
- Implemented dark landing: `docs/design/public-landing-v450-dark.png`
- Side-by-side review: `docs/design/public-landing-v450-comparison.png`
- Product imagery: `assets/landing/personal-dashboard.png`, `assets/landing/candidate-directory.png`, and `assets/landing/corporate-personnel.png`

The selected direction established the airy marketing structure. V450 adapts it to the real ATSRS product and existing design language rather than copying source text or introducing unimplemented capabilities.

### Viewports, themes and routes

- Desktop: default in-app browser viewport, light and dark themes.
- Mobile: `390 x 844`, with `0px` root horizontal overflow and a `68px` public header.
- Public root: landing visible only when there is no authenticated session.
- `?view=login`: existing login page visible; landing hidden; zero vertical or horizontal overflow at `390 x 844`.
- `?view=signup`: existing Personal/Corporate signup choice visible; landing hidden.

### Findings and fixes

- Content accuracy: Personal, Candidate and Corporate are presented as equal platform parts. No seafarer-only positioning, invented integration, mobile application, certification claim or undecided paid price appears.
- Plan boundaries: exactly four Personal tiers are shown. Free includes one lifetime AI scan, no Candidate directory listing, and no SMS/WhatsApp credits. Candidate listing starts at Bronze.
- Layout: desktop and 390px checks found no clipped or off-canvas content. Public controls have a minimum 44px interactive height; the mobile header removes the secondary header CTA while preserving Login and the primary hero CTA.
- Theme: the landing uses the existing saved light/dark preference and provides a scoped theme control without exposing signed-in application controls.
- Authentication: public CTA routes reuse the production login/signup interface; loading and authentication layouts were not redesigned.
- Wordmark: primary ATSRS lockups include `Automated Tracking & Reporting Systems`. The middle `S` occupies a fixed-width slot and alternates with `&` every 10 seconds using a 600ms Y-axis rotation; reduced-motion users receive a stable `S`.
- Accessibility: one H1, semantic sections, labelled navigation, descriptive screenshots, keyboard focus rings, reduced-motion support and persistent accessible `ATSRS` labels are present.
- Runtime: the application error listener recorded no public-landing exception. One isolated MutationObserver message emitted by the in-app inspection layer was not associated with the page window or application stack; a fresh page inspection found no landing script error.

### Comparison history

1. The selected source direction was retained as the visual reference.
2. ATSRS-specific platform, workflow, preview, plan, FAQ and CTA sections replaced generic generated copy.
3. A first browser pass exposed signed-in global controls over the public header; the public route now suppresses them.
4. Login initially repeated the expanded product name; the final lockup shows it exactly once and remains one-screen on mobile.
5. Desktop dark/light, 390px mobile, Login, Signup, theme switching and the 10-second wordmark cycle were rechecked after fixes.

final result: passed

## V448 expiry-summary signal design QA

### Visual source and implementation evidence

- Selected design source: `docs/qa/v448/source-option-3.png`
- Light implementation: `docs/qa/v448/implementation-light.png`
- Dark implementation: `docs/qa/v448/implementation-dark.png`
- Full light comparison: `docs/qa/v448/comparison-full-light.png`
- Focused expiry-card comparison: `docs/qa/v448/comparison-focused-expiry.png`

The selected third design keeps every summary card neutral and applies urgency color only to the compact circular icon and numeric value. The label remains readable neutral text, so color is never the only status indicator.

### Viewport and state

- Browser viewport: `1280 x 720` CSS pixels; captured content width: `1265px` after the vertical scrollbar.
- Source image: `1708 x 921` pixels.
- States checked: Personal light, Personal dark, Corporate light and Corporate dark.
- Summary order: Uploaded, 90 days, 60 days, 30 days, 1 week and Expired.

### Findings

- Layout: six equal columns at desktop, three columns at `<=1100px`, and two columns at `<=560px`.
- Surfaces: cards remain white/neutral in light mode and dark neutral in dark mode; no urgency-tinted card backgrounds were introduced.
- Light signals: slate `#64748b`, blue `#2563eb`, muted gold `#b7791f`, amber `#c56a00`, orange `#dc5a11`, red `#c62828`.
- Dark signals: slate `#a8b5c5`, blue `#73a7ff`, gold `#e5b94c`, amber `#f0a23b`, orange `#ff874d`, red `#ff7373`.
- Accessibility: labels name each time window, icons differ by state, and the signal color is supplemental. Light-theme gold/orange values are bold large text and meet the large-text contrast threshold; all dark-theme values exceed normal-text contrast.
- Icons: real Phosphor icons are used (`file-text`, `calendar-dots`, `calendar-x`, `x-circle`); no handcrafted SVG or placeholder asset was added.
- Scope: the same component rules apply to Personal and Corporate. Authentication, login and loading surfaces are unchanged.
- Overflow: `0px` root overflow and `0px` card overflow in all four inspected states.
- Console errors: `0` in the final Corporate dark preview state.

### Comparison history

1. The first implementation pass exposed a CSS custom-property specificity issue that made every card slate.
2. The default variable was removed from the higher-specificity selector so each semantic category resolves its intended signal color.
3. Personal and Corporate were recaptured in both themes; the focused comparison confirms the selected neutral-card hierarchy, compact icon circles and progressive urgency palette.
4. No P0, P1 or P2 mismatch remains within the requested expiry-summary scope.

final result: passed

## V447 dashboard, theme and document-preview QA

### Visual sources and implementation evidence

- Dashboard expiry source: `docs/qa/v447/source-dashboard-expiry.png`
- Header spacing source: `docs/qa/v447/source-header-spacing.png`
- Message-panel source: `docs/qa/v447/source-messages.png`
- Light-theme color source: `docs/qa/v447/source-light-theme-colors.png`
- Dashboard implementation: `docs/qa/v447/implementation-dashboard-light.png`
- Header implementation: `docs/qa/v447/implementation-header-light.png`
- Dashboard comparison: `docs/qa/v447/comparison-dashboard-light.png`
- Header comparison: `docs/qa/v447/comparison-header-light.png`

### Findings

- Personal Dashboard now has six document cards only: Uploaded Documents, Expiring in 90 Days, 60 Days, 30 Days, 1 Week and Expired. The self-referential CV card is removed.
- The expiry ranges are mutually exclusive: `61–90`, `31–60`, `8–30`, `0–7` and `<0` days. The Corporate Dashboard uses the same shared buckets when rendering its linked Personnel documents.
- Dashboard functional panels use `18px` internal padding in Personal and Corporate, so headings, descriptions, empty states and controls no longer touch their borders.
- Signed-in light mode uses blue for section-heading pills and the selected sidebar rail/text; dark mode keeps the approved sage/green treatment. Semantic document status colors remain unchanged.
- Notification, theme and account controls have equal `8px` gaps. The light-theme sun is within `0.34px` of the thumb center; the dark-theme moon measured exactly centered and remains a dark glyph on the white thumb.
- Company messages now identify their real source and lifecycle: signed-in Corporate accounts message a Personal Candidate profile; Active messages can be archived; Archive supports restore and permanent delete.
- Image and PDF preview stages expose a grab cursor only when their content overflows. Pointer capture keeps drag-to-pan stable; the image QA moved the zoomed document `428.67px` horizontally and `168px` vertically.
- Personal light and Corporate light shell checks reported no root horizontal overflow. All six dashboard labels remained unclipped in the inspected responsive contract.
- Automated regression suite: all repository tests passed, including the new preview-pan contract.

### Comparison history

1. The source retained the old CV card, broad expiry ranges, green light-theme headings and uneven header spacing.
2. V447 replaces those states without changing auth/loading pages or introducing new page routes.
3. The first dashboard check exposed a higher-specificity legacy `padding:0` rule; the owning Dashboard rule was corrected and remeasured at `18px`.
4. Sun alignment was tuned from a visible offset to a measured `-0.33px`, while both header gaps remained exactly `8px`.

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
- [x] V445 restores the Personal Security route to the real Account Security tab and removes large route-wrapper card surfaces across Personal and Corporate while retaining functional inner controls.

## V445 flat route-surface design QA

### Visual sources and implementation evidence

- Source Candidates: `docs/qa/v445/source-candidates-dark.png`
- Source Personnel: `docs/qa/v445/source-personnel-dark.png`
- V445 Candidates: `docs/qa/v445/implementation-candidates-dark.png`
- V445 Personnel: `docs/qa/v445/implementation-personnel-dark.png`
- Combined Candidates comparison: `docs/qa/v445/comparison-candidates-dark.png`
- Combined Personnel comparison: `docs/qa/v445/comparison-personnel-dark.png`
- Additional light-theme evidence: `docs/qa/v445/implementation-candidates-light.png` and `docs/qa/v445/implementation-personnel-light.png`

The supplied screenshots are the visual source for content, controls, typography, tokens and route structure. The requested change is intentionally limited to removing the large outer page card so the route content sits directly on the application background. Functional inner controls, filters, tables and candidate records remain intact.

### Viewport and state

- Live implementation viewport: `2048 x 1228` CSS pixels.
- Source images: `2560 x 1528`; normalized to `2048 x 1228` only for side-by-side comparison.
- Combined comparison canvas: `4096 x 1228`, source on the left and V445 on the right.
- State: authenticated Corporate workspace, dark theme, Candidates List and Personnel List.
- Route regression state: authenticated Personal Security and Corporate Compliance.

### Findings

- Typography and copy: route titles, section headings, labels, descriptions and table copy are unchanged.
- Layout: the large bordered/shadowed wrapper is removed. The title, filters and result area now sit directly on the page background with the existing internal section dividers.
- Functional surfaces: inputs, view toggles, status chips, tables, candidate cards and action buttons retain their existing boundaries and behavior.
- Colors and tokens: no new palette, button color or active-navigation treatment was introduced. Light and dark themes continue to use the current V445 shell tokens.
- Icons and assets: the existing Phosphor navigation and control icons are unchanged; no replacement or approximate asset was added.
- Responsive safety: no root horizontal overflow was observed in the V445 route harness or live desktop captures. Text and action controls remain visible at the inspected viewport.
- Interactions: Candidates and Personnel navigation, List mode, Personal Security routing and Corporate Compliance routing were exercised successfully.
- Console errors: `0` in the local route-surface harness and `0` in the inspected live Personnel state.

### Comparison history

1. The source screenshots showed each route inside one large general-purpose card.
2. V445 removes only that outer surface across Personal and Corporate route pages.
3. Candidates and Personnel were recaptured in matching dark/List states and combined with their source screenshots for final visual inspection.
4. No P0, P1 or P2 mismatch remains within the requested wrapper-removal scope.

final result: passed

## V446 document-register fit and flat-surface QA

### Visual sources and implementation evidence

- User source: `docs/qa/v446/source-personal-documents-dark.png`
- Personal implementation: `docs/qa/v446/implementation-personal-default.png`
- Corporate implementation: `docs/qa/v446/implementation-corporate-default.png`
- Full comparison: `docs/qa/v446/comparison-full-personal-dark.png`
- Focused register comparison: `docs/qa/v446/comparison-focused-register-dark.png`

The requested scope is limited to the Documents register: remove its general-purpose outer card, eliminate desktop horizontal scrolling, and constrain long certificate names to two lines without changing the existing palette or document actions.

### Findings

- Desktop layout: the register uses a fixed seven-column layout at `100%` width. Personal and Corporate both measured `0px` root overflow and `0px` register overflow at desktop widths.
- Long names: certificate names wrap naturally and are clamped to two lines; measured long-name height is `43px` at the current typography.
- Surface: the register wrapper is transparent, borderless and shadowless, so the table sits directly on the page background and gains the former card padding.
- Actions: Preview, Edit and Delete remain visible in a stable three-column action group. The Corporate desktop check measured each action group at `204px` client and scroll width.
- Colors and typography: existing dark/light tokens, font family, sizes and status colors are unchanged. Light theme was explicitly checked with a transparent wrapper and zero overflow.
- Responsive safety: at `390 x 844`, the page root remains at zero horizontal overflow. The seven-column register retains an internal scroller below `800px` so controls are not clipped on phones.
- Console errors: `0` in the inspected Personal light and Corporate dark fixture states.

### Comparison history

1. The source showed a wide outer table surface and a desktop horizontal scrollbar.
2. The register wrapper was flattened and the columns were assigned deterministic widths.
3. A first Corporate check exposed inherited minimum button widths; a higher-specificity action rule removed that overflow.
4. The final Personal and Corporate measurements pass with no P0, P1 or P2 findings in scope.

final result: passed

## V473 Product Updates workspace parity QA

### Scope and implementation evidence

- User reference: `C:/Users/user/AppData/Local/Temp/codex-clipboard-400cb537-dc68-4b88-9a2f-ade52ecbaf2d.png`
- Production build: `V473` (`css/shell-polish.css?v=465`).
- State: authenticated Personal and Corporate workspaces, Product Updates route.

The Product Updates page is now one shared visual surface. Workspace switching changes account context only; it no longer changes the route width, heading wrapping, description measure or card-grid geometry.

### Findings

- Layout: Personal and Corporate use the same centered `min(100%, 1440px)` route width and the same mobile inset below `800px`.
- Typography: hero and roadmap headings use the same line height and wrapping rules in both workspaces; paragraph measures no longer inherit Corporate-only limits.
- Cards: existing roadmap cards, status chips, content order, colors and functionality are unchanged.
- Surface: cards remain directly on the application background; no general-purpose wrapper card was reintroduced.
- Responsive safety: the shared route keeps a minimum width of zero and a `calc(100% - 16px)` mobile width, preventing page-level horizontal overflow.
- Regression: the full repository test suite, dedicated shell-polish contracts and build-marker consistency checks pass.
- Production verification: the deployed HTML reports `data-atsrs-build="V473"`; the deployed stylesheet contains the shared Personal/Corporate Product Updates selectors.

No P0, P1 or P2 mismatch remains within the requested Personal/Corporate parity scope.

final result: passed

## V474 Product Updates title-alignment QA

### Visual truth and rendered evidence

- Source Corporate: docs/qa/v474/source-corporate-light.png
- Source Personal: docs/qa/v474/source-personal-light.png
- V474 Corporate implementation: docs/qa/v474/implementation-corporate-light.png
- V474 Personal implementation: docs/qa/v474/implementation-personal-light.png
- Full-view Corporate comparison: docs/qa/v474/comparison-corporate-light.png
- Full-view Personal comparison: docs/qa/v474/comparison-personal-light.png

Source and implementation captures are 2048 x 1228 pixels at a 2048 x 1228 CSS viewport and device scale factor 1. State: authenticated Product Updates route, light theme, Personal and Corporate workspaces.

### Findings and comparison history

1. The source comparison exposed a P2 alignment mismatch: Corporate rendered the route-level Product Updates title against the main page edge while Personal aligned it to the centered Product Updates content column.
2. V474 applies the same positioned, centered min(100%, 1440px) width and 0 auto 16px margin to the active Product Updates #pageTitle in both account modes.
3. Post-fix Chrome measurements are equal for both modes: title x=349, width 1440; intro x=349, width 1440; root horizontal overflow 0.
4. The hero text origin differs by only one subpixel-rounded CSS pixel (y=190 Personal, y=189 Corporate); this is a non-actionable P3 browser rounding difference and does not change visible spacing or wrapping.
5. Dark-theme desktop measurements retain the same title and intro geometry. The mobile CSS contract applies the same calc(100% - 16px) width to both the title and intro below 800px.

### Required fidelity surfaces

- Fonts and typography: font family, sizes, weights, wrapping and copy remain unchanged.
- Spacing and layout rhythm: the Corporate title now shares the Personal content axis and vertical margin.
- Colors and tokens: no palette, border, background, status or theme token changed.
- Image and icon fidelity: no assets or icons were replaced.
- Copy and content: all Product Updates headings, descriptions, cards and statuses are unchanged.
- Interactions: account switching and route selection behavior are unchanged; only route-title geometry changed.
- Regression: all repository tests pass, including the new title-alignment contract.

No actionable P0, P1 or P2 mismatch remains in the requested scope.

final result: passed

## V478 Corporate Account outer-surface QA

### Visual sources and implementation evidence

- User source: `C:/Users/user/AppData/Local/Temp/codex-clipboard-cc0edf2a-f43f-4ba2-8d17-7d26e3694703.png`
- Matched browser captures: `docs/audit/corporate-account-v478/01-before-dark.jpg` and `02-after-dark.jpg`
- Theme evidence: `03-after-light.jpg`
- Responsive evidence: `04-mobile-light.jpg` and `05-mobile-dark.jpg`
- Source pixels: 3439 x 1368 at approximately 1.5x desktop density.
- Matched pre/post browser pixels: 2293 x 735 at the same density.
- Responsive viewport override: 390 x 844; full-page captures are 374 x 1262 light and 374 x 1225 dark.

### Findings and comparison history

1. The source and pre-deploy live capture showed the Workspace details group inside a large general-purpose outer card.
2. V478 removes only the outer background, border, radius and padding from `.corporate-account-context`.
3. Post-fix matched dark captures confirm that the two definition cards and Open Security action remain intact.
4. Live dark/light and 390px checks report transparent outer background, 0px outer border/padding, 0px root horizontal overflow, 44px mobile action height and 0 browser warning/error logs.
5. Company navigation, General, Open Security, Security and return-to-General interactions pass. No P0, P1 or P2 finding remains in scope.

final result: passed

## V485 unified phone-field QA

- Scope: Personal Profile mobile-phone and WhatsApp-number fields.
- Preserved the existing ATSRS colour system; only the control structure and spacing changed.
- Country flag, calling code and caret share one separated leading section inside a single rounded field.
- Desktop light/dark and 390px mobile layouts checked with no horizontal overflow.
- The country-code search logic is unchanged: an exact `+994` match shows Azerbaijan only, while deleting digits progressively reveals the other matching countries.
- The leading country segment and its dropdown are now compact, the caret is centred, and the open one-result menu wraps the matching country without excess empty space.
- Phone and WhatsApp verification rows retain a clean two-column alignment without touching or crossing their field edges.
- Keyboard focus remains visible through a neutral field border without the previous green selection ring.
- Browser console errors: 0.
- Targeted regression tests: passed.
