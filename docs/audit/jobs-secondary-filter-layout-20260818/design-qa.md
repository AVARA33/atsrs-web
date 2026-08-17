# Jobs secondary filter layout — design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-a7d526cf-60af-4a1e-83eb-f8f85a5b408e.png`, together with the user-approved three-row wireframe in the current request.
- Implementation screenshots:
  - `C:\Users\user\Documents\GitHub\atsrs-secondary-filter-layout\docs\audit\jobs-secondary-filter-layout-20260818\desktop-dark.png`
  - `C:\Users\user\Documents\GitHub\atsrs-secondary-filter-layout\docs\audit\jobs-secondary-filter-layout-20260818\desktop-light.png`
- Viewport: 1440 × 900 CSS px, desktop Cards state.
- Source pixels: 2560 × 1536. Implementation pixels: 1440 × 900. The source is a full-browser production baseline rather than a pixel-scale target, so comparison was normalized by the Jobs content region and the approved row hierarchy.
- States: dark and light; neutral controls plus selected Offshore token checks; Cards pagination visible.

## Full-view comparison evidence

The secondary toolbar now has three explicit visual tiers. Company, Recruiter and Date posted form a bounded left-aligned first row. Offshore, Onshore and New jobs only form a compact right-aligned second row. Pagination is right-aligned on a third row with 18px clear separation and no shared container with the filters. Cards begin after an additional 20px gap.

## Focused region comparison evidence

- Company and Recruiter are 300 × 46px; Date posted is 220 × 46px.
- Labels are 12px with an 8px label-to-control gap.
- Desktop worksite chips are 36px high; the toggle group is 36px high.
- Dark selected chip uses the ATSRS Jobs/logo green token `#9ad315` with a restrained translucent surface.
- Light selected chip uses the existing ATSRS blue `#245b93` with a restrained translucent surface.
- Exactly one instance of each filter control is present.
- 390px mobile keeps 44px fields, 40px worksite chips and zero horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: existing ATSRS type stack, weights and content retained; only secondary labels move from 10px to the approved readable 12px.
- Spacing and layout rhythm: approved two filter rows plus separate pagination row; balanced 14px field gaps and 18–20px vertical separation.
- Colors and visual tokens: existing dark logo-green and light ATSRS blue selected-state tokens reused; no new palette introduced.
- Image quality and asset fidelity: no image or logo assets changed.
- Copy and content: filter labels, options, pagination copy and Jobs content unchanged.

## Comparison history

1. Initial implementation exposed two P2 issues in computed production-style CSS: global button rules forced 44px desktop chips and neutralized selected chip colours.
2. Fixed with control-scoped specificity for the two existing Worksite chip IDs. Desktop is now 36px, mobile remains 40px, dark selected is logo-green and light selected is ATSRS blue.
3. Post-fix captures show no remaining P0/P1/P2 mismatch, no duplicate controls and no horizontal overflow.

## Findings

No actionable P0, P1 or P2 findings remain.

## Primary interactions tested

- Offshore selection filters the fixture dataset and updates the result count.
- Offshore deselection restores pagination.
- New jobs only switch changes state and uses the theme token.
- Mobile More filters disclosure opens correctly.
- Console errors: 0.

## Final result

final result: passed


