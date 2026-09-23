# JobSearch compact card height — V6163

Reference: `codex-clipboard-4f6b7b89-ca46-4cab-b853-d1a9b64765f2.png`

Scope: restore compact JobSearch card rows without changing card content, actions, filters, or navigation.

## Browser verification

- Grid row sizing: `auto` (previously `1fr`).
- First fixture row: all three cards `612px` because that row includes a deliberately long stress-test vacancy.
- Second fixture row: all three cards `349px`.
- Cards remain equal-height within each row.
- Different rows no longer inherit the tallest card height from the whole result page.

Final result: passed.
