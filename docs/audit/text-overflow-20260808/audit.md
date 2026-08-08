# ATSRS card text inset audit

## Scope

Combined UX and responsive-layout audit of card and cell text in the live Corporate Product Updates and Dashboard surfaces, followed by a focused Personal/Corporate-safe CSS correction.

## Steps and health

1. Product Updates, desktop - needs correction. The hero copy sits on the panel boundary because a legacy Personal workspace rule removes its intended padding. Roadmap cards wrap, but the layout has no shared defensive wrapping rule.
2. Corporate Dashboard, desktop - needs correction. `corporate-dashboard-activity-grid` resets the standard 40px dashboard gutter to zero, placing notification and sent-request copy directly against the main vertical boundary.
3. Corporate Dashboard, 390px - needs correction. The document ledger intentionally scrolls, but functional card copy needs consistent 12px outer gutters and protected word wrapping.
4. Corrected desktop fixture - healthy. Product Updates uses 28px/32px content padding; activity cards start 40px inside the main boundary; detected text overflow is zero.
5. Corrected 390px fixture - healthy. Activity cards retain 12px page gutters, 16px-20px internal spacing, natural word wrapping, and zero document-level horizontal overflow.

## Accessibility and evidence limits

- Visible clipping, border collisions, reflow, and horizontal overflow were checked.
- Keyboard and screen-reader semantics were not changed by this CSS-only correction.
- The local fixture uses neutral sample copy and does not reproduce production PII.

## Recommendation

Keep component-specific gutters and the shared `overflow-wrap: break-word` safeguard covered by regression tests. Do not use `word-break: break-all`, which would reduce readability.
