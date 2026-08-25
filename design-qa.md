# Sharing V1 Design QA

- Reference: `codex-clipboard-e34d742b-e7da-49fa-bf89-6e6090ba782c.png`
- Runtime: production Profile → Sharing on `atsrs.com`
- Comparison state: desktop, empty active-link state, light and dark themes
- Adapted requirement: the title/subtitle and Create Share Link button are intentionally omitted pending the user's placement decision.

## Layout

- Outer viewport: 1109 × 295 px.
- Sharing panel: 1107 × 294 px.
- New Sharing UI: 1060 × 270 px.
- No horizontal or vertical overflow.
- Legacy Sharing UI is `display:none`; only `profileTabSharingPanel` is visible.

## Visual parity

- Audience choices, expiry control, included-information icons, and active-link area match the selected reference hierarchy.
- Existing ATSRS tokens are used for borders, surfaces, focus rings, typography, dark green accent, and light blue accent.
- Dark theme surfaces resolve to the existing ATSRS dark surface; light theme uses the existing white surface.
- No custom raster assets are required; all UI icons use the existing Phosphor icon library.

## Interaction checks

- Audience radio selection works.
- Expiry selection updates the visible expiry date and the existing legacy expiry state.
- View details opens Privacy and returning to Sharing preserves the panel.
- Copy, Open, and Revoke actions delegate to the existing production sharing functions when an active link exists.
- Empty state renders when no active link exists.

## Responsive checks

- Desktop grid is contained within the fixed profile card.
- At 760 px and below, setup sections and audience choices collapse to one column, rows simplify, and vertical scrolling is enabled inside the existing mobile profile viewport.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: Create Share Link button placement remains intentionally deferred to the next user instruction.

final result: passed
