# ATSRS V530 Transparent Raised Light Glass QA

## Evidence

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-f4d61fdd-711d-430a-8a42-a61a9fd48dd2.jpg` (736 x 1104 px).
- Browser-rendered implementation: `tests/artifacts/v530/light-desktop.png` and `tests/artifacts/v530/light-mobile.png`.
- Same-frame comparison: `tests/artifacts/v530/comparison-light.png` contains the Light half of the reference beside the V530 desktop implementation.
- Viewports: 2294 x 735 desktop and 390 x 844 mobile.

## Source Characteristics

- Light canvas: cool blue-grey, approximately `#CCD3DE` at the top and `#BAC9D9` lower down.
- Cards: milky white translucent glass rather than opaque blue-grey fills.
- Shape: visibly raised and pillow-like, with a rounded 18px silhouette, a bright upper edge and a soft outer shadow.
- The canvas remains visible through the material; the card interior does not become solid white.

## P1 Mismatch Found in V529

- The Light cards were too opaque and too blue-grey.
- Their material merged with the canvas and did not reproduce the reference's white transparent raised-pillow effect.

## V530 Fix

- Light card layers: `rgba(255,255,255,.36)` to `rgba(246,250,255,.16)` plus a restrained white top highlight.
- Border: `rgba(255,255,255,.64)`.
- Raised shadow: `0 18px 36px rgba(62,79,103,.13)` plus a close `0 3px 9px` contact shadow.
- Pillow edge: inset white upper highlight and a very soft cool lower edge.
- Backdrop filter: 24px blur with 116% saturation.
- Radius: 18px desktop and 16px at 520px and below.
- Light text remains ATSRS navy for accessible contrast.
- Dark V529 tokens remain unchanged: `rgba(23,31,46,.56)` to `rgba(11,18,30,.44)` over `#151D2A` to `#040A14`.
- Public Home, Login, Loading, sidebar and form controls remain excluded.

## Coverage

- Personal and Corporate Dashboard summary cards and lower functional panels.
- References CV panel, AI CV panel and Main CV row.
- Profile Work Availability and owner-only Admin Overview cards.
- Product Updates roadmap cards.
- Corporate Projects, Personnel, Candidates, Compliance and Reports cards.
- Recipient link/request cards.

## Verification

- Same-frame comparison: Light cards now match the reference direction as white, transparent, raised glass pillows.
- Light/Dark theme switch: passed.
- Dark material regression: unchanged and passed.
- Desktop and 390px card layout: passed.
- 390px horizontal overflow: 0.
- Focused regression suite: 16 files passed.
- Cloudflare Pages build: passed, 109 files.
- Public/auth surfaces remain outside the stylesheet scope.

final result: passed
