# Notification Card Design QA

- Source visual truth: `C:/Users/user/AppData/Local/Temp/codex-clipboard-b79285cc-03a0-4db4-a817-d162721c02a8.png`
- Implementation screenshot: `C:/Users/user/Documents/GitHub/atsrs-web/design-qa-notification-cards.png`
- Viewport: 2294 × 791 CSS pixels, device density 1
- Source pixels: 400 × 300; implementation focused crop: 385 × 195
- State: authenticated Personal account, dark theme, notification popover open with one pending download request

## Full-view comparison evidence

The source establishes the intended density and structure rather than an ATSRS-specific visual clone: a compact notification surface composed of separate rounded cards with a leading identity marker, concise stacked copy, an unread state, and internal scrolling for overflow. The implementation uses the existing ATSRS dark-theme tokens and places the same structure inside the existing bell popover.

## Focused-region comparison evidence

The focused live capture confirms a 350-pixel popover, a 332-pixel individual card, a measured card height of 54.8 pixels, separate icon/copy/status columns, an unread dot, and text truncation protection. The list is capped at 326 pixels, allowing five cards before internal scrolling. Browser console warnings and errors were empty.

## Required fidelity surfaces

- Fonts and typography: existing ATSRS system typography is preserved; title, detail, email, and status have distinct weights and sizes without wrapping at the tested width.
- Spacing and layout rhythm: the card is within the requested 52–56 pixel range; 7-pixel gaps and 9-pixel list padding create separate cards without excessive height.
- Colors and visual tokens: dark mode uses ATSRS neutral black surfaces and green accent; light mode uses white cards, blue hover border, and the existing blue accent variable.
- Image and icon quality: the existing Phosphor icon library is used; no placeholder or custom-drawn asset was introduced.
- Copy and content: requester name, request type, company, verified email, and unread status remain visible.

## Findings

No actionable P0, P1, or P2 mismatch remains. The source is a light mobile reference while the verified implementation is an ATSRS dark desktop popover; theme and frame differences are intentional product adaptations.

## Primary interactions tested

- Bell opens the popover.
- Pending request renders as an individual card.
- Popover and card dimensions stay within the compact target.
- Existing request routing contract and clear-all behavior pass automated tests.

## Comparison history

- Initial implementation used full-width divided rows. It was replaced with rounded individual cards, 54.8-pixel measured height, a leading icon, unread marker, and a five-card scroll cap.
- Post-fix live capture shows no remaining P0/P1/P2 findings.

## Follow-up polish

- P3: replace the generic download icon with a verified requester avatar if ATSRS later stores a consented avatar for this request context.

final result: passed
