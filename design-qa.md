# Share dialog standard fields — design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-1a63e4af-afc5-43b8-ac03-9089c8db24ea.png`
- Canonical target: `css/floating-field-standard-v58178.css`
- Implementation: `index.html` (`#profileSharingDocumentDialog`) and `css/profile-sharing-v1.css`
- Browser-rendered QA URL: `http://127.0.0.1:4173/tests/fixtures/profile-sharing-standard-fields-harness.html`
- Desktop viewport: 1280 × 720 CSS px, device scale 1
- Mobile viewport: 390 × 844 CSS px, device scale 1
- Source pixels: 3440 × 1368
- States: dark idle, dark focused, light idle, mobile dark

**Full-view comparison evidence**

- The source showed three legacy 34px recipient inputs with 7px radii and labels above the controls.
- The implementation uses the existing ATSRS canonical 44px field shell, 10px radius, border-mounted floating labels, theme tokens, and standard focus treatment.
- The modal hierarchy, duration controls, document rows, actions, text, and behavior remain unchanged.

**Focused region comparison evidence**

- Recipient, Company, and Email were inspected together at desktop size in both themes.
- Focus on Recipient shows the canonical dark-theme green inline border/ring and accent label.
- Light mode uses the canonical blue accent and white field surface.
- At 390px width all three fields stack without horizontal clipping; the footer and document rows remain usable.

**Findings**

- No actionable P0/P1/P2 differences remain for the requested field-standardization scope.
- Fonts and typography: labels and values inherit the canonical ATSRS field system.
- Spacing and layout rhythm: 10px desktop gap; single-column mobile layout; no overflow.
- Colors and tokens: dark green and light blue theme accents verified.
- Image quality and assets: not applicable; no visual assets changed.
- Copy and content: unchanged.

**Interaction and console checks**

- Field focus state tested.
- Dark/light theme switching tested.
- Mobile responsive breakpoint tested at 390 × 844.
- Browser console errors/warnings: none.

**Comparison history**

- Initial issue: three fields used modal-specific 34px controls and bypassed the shared ATSRS field shell.
- Fix: adopted `.atsrs-field-shell` and `.atsrs-field-label`; removed recipient-input overrides.
- Post-fix evidence: desktop dark/light and mobile renders show the canonical design with no P0/P1/P2 findings.

final result: passed
