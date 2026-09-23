# Recruiter card design QA

## Scope

- Reference image: `C:/Users/user/AppData/Local/Temp/codex-clipboard-3c80dc14-8531-4ea6-a297-c3a4133b8d69.png`
- Implementation: `https://atsrs.com/?route=recruiters&card_qa=6157`
- Implementation capture: live Codex Chrome browser capture of build V6157
- Reference viewport: 1617 x 983 image pixels
- Implementation viewport: 1366 x 768 CSS pixels (standard notebook target)
- State: authenticated Recruiter Directory, dark theme, first result page
- Density normalization: the card region was compared proportionally because the reference and implementation captures use different viewport dimensions.

## Fidelity surfaces

- Layout: compact two-column horizontal cards; 108 px card height at notebook width; information and actions remain aligned.
- Typography: recruiter name 16 px, role/company and location 12 px, vacancy status 11 px.
- Styling: dark green surfaces, rounded corners, colored left accent rail, colored initials tile and subtle borders/shadows.
- Content: existing ATSRS recruiter data and copy remain the source of truth.
- Actions: existing LinkedIn/source, vacancy and profile-share actions are preserved; disabled vacancy states remain disabled.
- Responsive state: at 600 x 800 the grid becomes one column and actions move below the information without overlap.
- Light theme: scoped light-theme card styles are present and covered by the existing light-theme contract test.

## Comparison history

### Iteration 1 — V6156

- The card CSS matched the reference direction, but the live page still loaded the previous recruiter renderer because the route feature loader was cached.
- Fixed by versioning the route feature loader in V6157. This allowed the verified badge, separate location row and briefcase action icon to load consistently.

### Iteration 2 — V6157

- Live capture confirmed the compact two-column layout at 1366 x 768.
- Measured first card: approximately 580 x 108 px.
- Confirmed correct LinkedIn link, enabled/disabled vacancy actions and enabled sharing action.
- Browser console errors: none.
- No P0, P1 or P2 visual issues remain.

## Intentional differences

- The reference includes a fourth ellipsis control. ATSRS keeps its existing three functional actions because the user explicitly requested no functional changes.
- Hero, filters, sidebar, header and pagination were intentionally left unchanged.

## Final result

passed
