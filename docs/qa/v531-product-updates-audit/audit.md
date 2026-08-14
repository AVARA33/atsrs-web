# ATSRS V531 Product Updates audit

## Scope

- Surface: authenticated Product Updates page.
- States: Light and Dark at 2294 x 735 CSS px.
- User evidence: `C:\Users\user\AppData\Local\Temp\codex-clipboard-285d3e16-3041-46fa-a1e7-dff6867aada4.png`.
- Current-run captures: `01-light-before.png`, `02-dark-before.png`, `03-light-after.png`, `04-dark-after.png`.

## Findings

1. **P2 — Featured cards broke row symmetry.** Cards with a `NEW` label pushed their icon and title 16px lower than adjacent cards. This affected both themes and both rows.
2. **P2 — Dark hierarchy used green as ordinary text.** Page title, hero heading, roadmap heading and every card title all rendered lime `rgb(184,255,25)`. The repeated accent caused glare and made semantic green statuses less meaningful.
3. **P2 — Dark icons competed with statuses.** All six icon chips used the same green family as the selected navigation and availability states, adding another unnecessary accent layer.

## Fix applied

- Every card now reserves an identical 20px metadata row. Icons occupy row 2, titles row 3 and descriptions row 4 whether or not a `NEW` label exists.
- Dark ordinary headings now use neutral `#f4f7fb`, mirroring Light mode's dark text hierarchy.
- Dark icon chips now use a restrained blue treatment. Green remains only for meaningful live/available states and selected navigation.
- Light colours and semantic blue/amber/grey statuses remain unchanged.

## Verification

- Before: first-row icon/title tops were `338/397px` for featured and `322/381px` for ordinary cards — a 16px mismatch.
- After Dark: all first-row icon/title tops are `334/388px`; all second-row values are `562/616px`.
- After Light: all first-row icon/title tops are `336/390px`; all second-row values are `565/619px`.
- Page-level horizontal overflow: 0.
- Screenshot-only limit: keyboard focus and screen-reader output require separate runtime tests; no interaction was removed or changed.

final result: passed
