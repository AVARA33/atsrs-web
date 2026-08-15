# ATSRS Document Method Selection QA — V541

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-8285cd3d-2865-41d7-8e88-5432c8a46430.png`.
- Scope: Documents → Add document method selector and AI scan Cancel action.
- Production layout and typography were preserved.

## Implemented behavior

- `Scan with AI`, `Scan with QR`, and `Manual Upload` expose one exclusive active state through both `.active` and `aria-pressed`.
- Dark active state uses the approved ATSRS lime fill with dark text.
- Light active state uses the approved blue selection treatment.
- `Cancel` sits directly beside `Upload File` and closes the AI scan panel, clears the active method state, and returns keyboard focus to `Scan with AI`.
- Closing the QR dialog also clears its active method state.

## Browser verification

- Scan with AI selected: active state visible; AI panel and Cancel visible.
- Cancel selected: AI panel hidden; all method buttons return to unselected state.
- Manual Upload selected: manual panel visible; AI selection cleared.
- Scan with QR selected: QR selection active; other selections and panels cleared.
- Dark mode: selected method is lime/green.
- Light mode: selected method is blue.
- 390 × 844 viewport: buttons stack cleanly; document width and scroll width both 390 px; no horizontal overflow.
- Touch target check: method controls retain the 44 px minimum target standard.
- Browser console warnings/errors: 0.

## Findings

No actionable P0, P1, or P2 mismatch remains within the requested scope.

final result: passed

# ATSRS Product Updates Premium Markers QA — V543

- Scope: AI Document Scan and QR Phone Upload cards in Product Updates.
- Existing roadmap card geometry, availability statuses and light/dark hierarchy were preserved.

## Implemented behavior

- Both paid-plan value features expose a compact Phosphor star plus `PREMIUM` marker.
- The premium marker is independent from the right-aligned availability status.
- Dark mode uses a restrained gold marker; Light mode uses a contrast-safe amber marker.
- The marker stays on one line and reserves the status area to prevent overlap.

## Browser verification

- Light mode: both markers are visible, aligned and separated from `Available now`.
- Dark mode: both markers retain clear contrast without changing the approved green status treatment.
- AI, QR and Manual card icon/title/copy rows remain aligned.
- Focused regression suite: 16/16 passed.

## Findings

No actionable P0, P1 or P2 mismatch remains within the requested scope.

final result: passed
