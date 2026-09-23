# JobSearch profession backgrounds — V6170 design QA

## Scope

- Reference: `codex-clipboard-4eb894e2-543a-4d71-97d1-5a44a688d51f.png`
- Implementation: existing ATSRS JobSearch cards and expanded job dialog.
- Intentionally unchanged: card layout, typography, card height rules, filters, favorites, links, access controls, and detail-dialog behavior.

## Visual comparison

- Profession artwork is placed on the right side, matching the reference's visual hierarchy.
- A left-to-right surface gradient preserves readable text contrast.
- Card artwork stays decorative (`pointer-events: none`) and does not intercept controls.
- The expanded dialog reuses the same category and a softer overlay.
- Dark and light themes have separate readability overlays.

## Category coverage

- Offshore / ROV / marine
- Technology / software / data
- Construction / architecture / engineering
- Healthcare / laboratory
- Marketing / sales / HR
- Logistics / transport / hospitality
- Education / office fallback

## Verification

- Checked locally at a notebook-sized viewport in the in-app browser.
- Verified card text remains legible over the artwork.
- Verified different job categories select different artwork.
- Verified the expand control still opens the job dialog.
- Verified the expanded dialog displays the matching profession artwork.
- Automated focused tests: passed.

## Result

PASS — the implementation matches the requested background-image treatment without changing card functionality.
