# ATSRS light-mode green control contrast audit

## Scope

Focused visual and computed-style check of solid sage-green action controls in light mode, covering shared Personal/Corporate controls and the account avatar.

## Steps and health

1. Live Corporate action, before - needs correction. The control declares white `color`, but the older light-theme cascade leaves Chromium's `-webkit-text-fill-color` dark, so the rendered label is dark on green.
2. Corrected shared light-mode fixture - healthy. The action label and account-avatar initials use true white for both CSS foreground properties, producing a 4.85:1 contrast ratio on the sage background. The ivory notification control retains its dark foreground.
3. Responsive/code regression - healthy. The correction changes only foreground rendering and preserves existing spacing, dimensions, touch targets, dark mode, and functionality.

## Accessibility and evidence limits

- The visible foreground/background contrast and Chromium-specific text rendering were checked.
- No interaction semantics or application data were changed.
- Full keyboard and screen-reader behavior were not re-audited because this is a CSS-only color correction.
