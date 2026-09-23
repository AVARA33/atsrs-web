# Job card action boundary design QA

- Source visual: `C:/Users/user/AppData/Local/Temp/codex-clipboard-fc69eb03-672c-46c6-ade0-b598c0c8c719.png`
- Implemented state: local JobSearch fixture with `access=full`, dark theme, standard desktop viewport.
- Scope: move passive recruiter organisation/name/phone into the vacancy information area while leaving only actionable controls below the footer divider.

## Visual comparison

- Recruiter metadata now follows the vacancy facts inside the upper information block.
- The single footer divider sits below all passive metadata.
- The footer contains only recruiter LinkedIn, recruiter email, listing source, and application controls when those links exist.
- Missing optional controls do not create placeholder buttons.
- Existing equal-height card grid, text truncation, expand control, saved-job control, and responsive two-column action layout remain unchanged.
- No horizontal overflow or overlapping content was observed in the desktop fixture.

## Verification

- Full-access fixture inspected in the in-app browser.
- Focused JavaScript syntax and 24 regression tests passed.
- Dark-mode desktop visual comparison passed.

Final result: passed.
