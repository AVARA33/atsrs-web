# Design QA — Profile Nationality Edit Field

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-fd0d2388-0304-4eb6-9ef4-fe211ee6b280.png`
- Implementation target: `https://atsrs.com/`, Profile → Edit → Personal Information
- Viewport: 3439 × 1368 source screenshot
- State: dark mode, Personal Information edit mode

## Evidence and finding

The source screenshot shows the Nationality control overflowing its grid row, producing a taller black rectangle and shifting the arrow. The implementation now absolutely anchors the 20 px control shell inside the existing fixed-height field at 12 px horizontal inset and 3 px from the bottom.

- [P1] Post-fix browser capture is unavailable because the signed-in Chrome tab is controlled by another browser session.
- Focused profile contract tests: passed.
- Cloudflare build: passed.
- Production asset: `5930` is live.
- Browser console and post-fix visual comparison: pending access to the signed-in Chrome tab.

## Fidelity surfaces

- Typography: unchanged by the patch.
- Spacing/layout: control removed from grid sizing and anchored inside the row.
- Colors: wrapper, source and trigger remain transparent.
- Assets: unchanged.
- Copy/content: unchanged.

final result: blocked
