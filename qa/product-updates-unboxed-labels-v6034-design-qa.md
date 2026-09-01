# Product Updates unboxed endpoint labels V6034

- User reference: `C:/Users/user/AppData/Local/Temp/codex-clipboard-d49bf3b3-334a-4612-b6ad-dc9954d990c0.png`
- Implementation: `qa/product-updates-unboxed-labels-v6034-preview.png`
- Verified viewport: 2048 × 858

## Scope

Only the endpoint markers attached to the atlas route lines were changed. LIVE, BUILDING and NEXT zone cards, route lines, map, plan carousel, statistics and positions were not redesigned.

## Findings

- All 12 endpoint markers now compute to a transparent background.
- Marker border, padding and box shadow are removed.
- Existing circular status icons and endpoint text remain visible and clickable.
- Dark and light theme text shadows preserve label readability without recreating a container.
- No horizontal overflow was introduced.
- Browser console is clean in the verified preview.

## Verification

- `node tests/product-updates-unboxed-labels-v6034.test.cjs` passed.
- `npm run build:cloudflare` passed.

final result: passed
