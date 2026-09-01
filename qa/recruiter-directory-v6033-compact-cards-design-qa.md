# Recruiter Directory compact cards — V6033

## Inputs

- Reference: `qa/recruiter-directory-v6033-compact-cards-reference.png`
- Implementation: `qa/recruiter-directory-v6033-compact-cards-preview.png`
- Combined comparison: `qa/recruiter-directory-v6033-compact-cards-comparison.png`
- Browser measurement viewport: 1280 × 720

## Verification

- Desktop grid renders three equal columns (`320.22px` each in the QA viewport).
- Card height is consistently `158px`, reduced from the former `220px` minimum.
- All three card actions remain on one row and fit inside the card without horizontal overflow.
- Each action is `25px` high and shares the available width equally (`95.94px` in the measured card).
- Recruiter identity, vacancy state and all three actions remain visible and interactive.
- At narrower layouts the existing responsive flow remains two columns, then one column on mobile.
- No transparency or pagination changes are included in this pass, following the user’s requested sequencing.

## Issues

- P0: none.
- P1: none.
- P2: none.
- P3: long recruiter metadata is intentionally ellipsized in the compact desktop card; the full data remains available in the underlying record and linked actions.

final result: passed
