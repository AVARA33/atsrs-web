# Design QA — Profile Nationality Edit Field

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-fd0d2388-0304-4eb6-9ef4-fe211ee6b280.png`
- Implementation target: `tests/fixtures/profile-nationality-control-harness.html`
- Implementation screenshot: `tests/artifacts/profile-nationality-control-5931.png`
- Viewport: 3439 × 1368 source screenshot
- State: dark mode, Personal Information edit mode

## Evidence and finding

The source screenshot shows an independently painted dark select surface inside the Nationality field. The focused implementation removes the native select from painting entirely: the selected country is rendered by the same `strong` value element used by the other fields, while the transparent trigger only handles interaction.

- Focused reproduction geometry: field height 34 px; transparent shell, source and trigger each 20 px; source opacity 0.
- Dropdown state: menu background `rgb(5, 6, 6)`; selected background transparent; selected text `rgb(244, 246, 239)`.
- [P1] Production post-fix capture remains unavailable because the signed-in Chrome tab is controlled by another browser session.
- Focused profile contract tests: passed.
- Cloudflare build: passed.
- Browser console in focused reproduction: no errors.
- Browser console and post-fix visual comparison: pending access to the signed-in Chrome tab.

## Fidelity surfaces

- Typography: unchanged by the patch.
- Spacing/layout: visible value uses the existing field value layer; transparent control remains anchored inside the row.
- Colors: wrapper, source and trigger remain transparent.
- Assets: unchanged.
- Copy/content: unchanged.

final result: blocked
