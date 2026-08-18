# Home Job Search Section — Design QA

## Comparison target

- Source visual truth: `source-production-desktop-light.png` plus the approved user brief and the existing Home Page `details > summary` interaction used by FAQ.
- Implementation: `implementation-desktop-light-open.png`, `implementation-desktop-dark-open.png`, `implementation-390-light-open.png`, and `implementation-390-dark-open.png`.
- Desktop viewport: 1440 × 900 CSS px; source and implementation captures are both 1440 × 900 px at browser density 1.
- Mobile viewport: 390 × 844 CSS px; implementation captures are 390 × 844 px at browser density 1.
- State: Home Page, Job Search expanded; closed/default state was also exercised separately.
- Density normalization: none required because each comparison pair uses matching CSS and image dimensions.

## Full-view comparison evidence

The production source shows Job Search as a narrow single-column service card inside the three-column Platform card family. The implementation intentionally replaces that rejected composition with a full-width standalone Home Page section. The new title uses the same Georgia display hierarchy, section width, color tokens, and vertical rhythm as the other major Home headings. The section is separated with the existing neutral line token rather than a new card surface.

## Focused region comparison evidence

The Job Search region was inspected in open and closed states at desktop and 390 px. The native `details > summary` pattern preserves the same disclosure marker and opening/closing behavior used by Home FAQ. The expanded description and Explore Jobs link remain below the heading, use the existing body/link typography, and do not collide or overflow. No image asset is present or required in this section.

## Required fidelity surfaces

- Fonts and typography: major title matches existing Home display headings; eyebrow, body copy, and CTA reuse current Home classes/tokens.
- Spacing and layout rhythm: standalone 1240 px section width on desktop; existing responsive section width on mobile; content column remains readable at 760 px maximum.
- Colors and visual tokens: light uses `--public-accent` blue; dark uses the existing `--public-accent` green. No new colors were introduced.
- Image quality and asset fidelity: no image, logo, or custom icon asset was changed or added.
- Copy and content: approved heading, description, and Explore Jobs CTA are preserved exactly.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3 accepted: the disclosure summary inherits the existing global focus-visible outline, matching the current Home accessibility treatment.

## Comparison history

1. Source finding (P1): Job Search appeared as a small narrow card and did not read as a major Home service.
2. Fix: removed the card/grid placement and replaced it with a standalone full-width disclosure section using the existing Home details/summary interaction.
3. Post-fix evidence: desktop and 390 px captures in both themes show the major heading hierarchy, hidden closed content, revealed open content, theme-token parity, and zero horizontal overflow.

## Interaction and regression checks

- Default state remains closed while the major Job Search heading remains visible.
- Pointer disclosure toggle opens and closes the content.
- Explore Jobs retains `?view=jobs` and the existing Jobs route.
- Desktop and 390 px: no horizontal overflow.
- Browser console errors: 0.

final result: passed
