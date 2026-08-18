# Jobs view selector selected-state design QA

- Source reference: `C:\Users\user\AppData\Local\Temp\codex-clipboard-a7d526cf-60af-4a1e-83eb-f8f85a5b408e.png`
- Implementation surface: `tests/fixtures/jobs-prototype-harness.html`
- Product stylesheet: `css/jobs-prototype.css?v=58142`
- Desktop viewport: 1280×720 (in-app browser maximum desktop canvas)
- Mobile viewport: 390×844

## Comparison

The supplied ATSRS screenshot and the rendered implementation screenshots were inspected together. The accepted design language is preserved: only the active Cards/List item receives a compact control surface; the inactive item remains visually plain. In light mode the active surface uses the existing ATSRS light accent tokens and a 2px official blue underline. Dark mode retains its existing dark surface, green text, and green underline without CSS changes.

## Evidence

- `desktop-light-cards.png`: Cards active; List plain.
- `desktop-light-list.png`: List active; Cards plain.
- `mobile-light-cards.png`: 390px responsive active state; zero horizontal overflow.
- `desktop-dark-regression.png`: approved dark-mode state unchanged.

## Measured states

- Light active: `#edf4fb` surface, `#c8d9eb` subtle border, 10px radius, `#245b93` text, `#2f6fb2` 2px underline.
- Light inactive: transparent surface and visually transparent border; no pseudo-element underline.
- Both controls retain 44px height and switching moves the single `aria-pressed=true` state.
- Dark active: `#0c120f` surface, no border, existing green text/underline.
- Console errors: 0.
- Horizontal overflow: 0 at desktop and 390px.

## QA history

1. Initial light render confirmed the prior selected state lacked the requested Clear-filters-family border/radius treatment.
2. Updated render confirmed compact selected surface and official blue underline on Cards.
3. Interaction render confirmed the same treatment moves to List and disappears from Cards.
4. Mobile and dark-regression renders confirmed responsive stability and theme isolation.

final result: passed
