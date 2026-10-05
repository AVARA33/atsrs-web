# JobSearch reference reconstruction QA — V6203

## Source of truth

- Reference: `C:\Users\user\AppData\Local\Temp\codex-clipboard-1b68226d-0f99-491b-bb36-50b148c7ee15.png`
- Brief: `C:\Users\user\.codex\attachments\f74d76dc-7cc1-4372-8059-4460d01d0720\Вставленный текст.txt`
- Surface: authenticated `?route=jobs`

## Comparison checklist

- [x] Near-black `#0C0D0E` canvas and `#080A0B` sidebar.
- [x] Compact `JobSearch` heading replaces the former large map banner.
- [x] Existing search/filter markup and behaviour remain unchanged.
- [x] Responsive 3-column desktop grid and 334px reference card height.
- [x] `#0B0C0D` card, `#34383C` border, `#AC613B` accent/CTA, `#C06D45` hover.
- [x] Natural-colour photos with `.58`/`.82` black overlays; no copper recolouring.
- [x] Six HD offshore backgrounds: ROV, construction vessel, platform, subsea construction, supply vessel and survey vessel.
- [x] Deterministic artwork selection by company/vacancy keywords.
- [x] Recruiter metadata remains bottom-left when available; View Job remains bottom-right.
- [x] Company-logo layer is deferred and hidden until crop approval, per user instruction.
- [x] Light mode keeps the same dark card treatment.
- [x] Runtime syntax check and 30 focused tests pass.

## Result

PASS for the background/card stage. Company logos are intentionally deferred to the next positioning pass.
