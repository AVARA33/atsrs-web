# JobSearch expanded contact actions — Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-7c444322-27a0-4043-a164-c6d7c1177f18.png`
- Implementation screenshot: `C:\Users\user\Documents\GitHub\atsrs-rotation-earnings\output\job-detail-contact-actions-v6289.png`
- Side-by-side comparison: `C:\Users\user\Documents\GitHub\atsrs-rotation-earnings\output\job-detail-contact-actions-v6289-comparison.png`
- Desktop viewport: 1440 × 900 CSS px, device scale factor 1.
- Mobile verification viewport: 390 × 844 CSS px, device scale factor 1.
- Source pixels: 2560 × 1528. Implementation pixels: 1440 × 900. The comparison montage preserves aspect ratio and fits each artifact inside a 1400 × 900 comparison cell.
- State: dark ATSRS JobSearch, expanded vacancy detail, full-access contact section.

**Findings**

- Initial P1 — contact actions used stale green field surfaces and split across two rows.
  - Location: expanded vacancy, `job-detail-contacts`.
  - Evidence: the source screenshot shows LinkedIn/email in a green upper pair and source/application in a separate green lower pair.
  - Impact: the action area looked inconsistent with the current copper brand and visually fragmented one related action group.
  - Fix: separated passive recruiter metadata from actions; placed LinkedIn, email, source and application in a four-column bottom row; removed resting borders, green surfaces and shadows; retained copper link emphasis and an accessible copper focus outline.

**Full-view comparison evidence**

- The expanded dialog hierarchy, artwork, typography and content rhythm remain unchanged.
- Passive recruiter organisation/name/phone stay in the first information row.
- All available contact/application actions now share the next row, with equal columns and a common top edge.
- No green action boxes remain in the expanded dialog.

**Focused region comparison evidence**

- The contact section was inspected separately because the requested differences are too small to judge reliably from the full dialog alone.
- Browser measurements at 1440 px: four equal `246.667px` columns; every action begins at `y=675`; border width `0px`; transparent background; no box shadow.
- Browser measurements at 390 px after a clean reload: one `366px` column, document width `390px`, and no horizontal overflow.

**Required fidelity surfaces**

- Fonts and typography: existing ATSRS families, weights, sizes and uppercase labels preserved.
- Spacing and layout rhythm: fixed; actions now form one bottom row on desktop and responsive columns on smaller screens.
- Colors and visual tokens: fixed; stale green field surfaces removed and copper action color retained.
- Image quality and asset fidelity: existing vacancy artwork, crop and overlays preserved; no image assets changed.
- Copy and content: existing labels and vacancy data preserved.

**Comparison history**

1. Initial reference review found the P1 green-surface and split-row mismatch.
2. First implementation separated metadata/actions and created the four-column action row.
3. Browser inspection found missing-link static content did not share the same internal grid rhythm; the action-item grid contract was added.
4. Revised desktop and mobile captures show aligned action starts, neutral surfaces, no horizontal overflow, and no browser console warnings/errors.

**Implementation Checklist**

- [x] Remove green resting borders/backgrounds from expanded contact actions.
- [x] Keep passive recruiter details separate from interactive actions.
- [x] Align four actions in one desktop row.
- [x] Preserve responsive behavior without horizontal overflow.
- [x] Preserve hover/focus accessibility with the copper brand token.

**Follow-up Polish**

- No P3 items remain for this scoped change.

final result: passed
