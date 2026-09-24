# Recruiter network artwork and JobSearch contrast — Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-330f113a-256f-42a2-91db-d96271ac9ff0.png`.
- JobSearch contrast reference: `C:\Users\user\AppData\Local\Temp\codex-clipboard-827ae7d5-32cf-400c-bb80-33311cdd1fcf.png`.
- Generated project asset: `assets/recruiter-card-backgrounds/talent-network-v2.webp` (1600 × 534, 26 KB).
- Browser verification: `tests/fixtures/jobs-prototype-harness.html?route=jobs&_atsrs_release=V6190-qa`.

## Fidelity and readability

- Recruiter cards use one consistent dark emerald talent-network illustration with flowing lines, connected nodes and human silhouettes.
- The left side remains deliberately dark for recruiter identity text; artwork detail is concentrated across the middle and right.
- Existing avatar colors, left accent bars, dimensions, actions and behavior remain unchanged.
- JobSearch informational text resolves to `rgb(248, 250, 252)` in both themes.
- Expanded JobSearch description, fact labels and values also resolve to `rgb(248, 250, 252)`.
- Recruiter organisation metadata has transparent background and border, so no separate black rectangle appears.

## Responsive and interaction checks

- Existing compact desktop two-column and mobile one-column rules remain unchanged.
- Light-theme card surface remains dark for artwork and white-text contrast.
- Expanded-card interaction opened successfully in the browser fixture.
- Focused automated checks: 23 passed.
- Cloudflare build: passed, 495 files.
- No actionable P0, P1 or P2 finding remains.

final result: passed
