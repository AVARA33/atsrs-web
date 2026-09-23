# Company reference artwork V6180 design QA

- Scope: Company card background imagery and deterministic sector mapping only.
- Reference: user-supplied Company directory mock.
- Assets: nine project-local Company-only WebP backgrounds; no JobSearch or Recruiter artwork is reused.
- Mapping: energy/refinery, telecom, coastal development, infrastructure, offshore, science, hospitality, logistics, and general corporate network.
- Card dimensions, content, controls, fetching, pagination, and functionality remain unchanged.
- Automated tests: 20 passed.
- Cloudflare build: 493 files.
- Dark-mode live QA: passed on V6180; sector subjects, tones, text, logos, and actions remain clear.
- Light-mode live QA: passed on V6180 at artwork opacity `.48`; pale overlays retain the image while preserving readable content.
- Live mapping sampled: Aramco/SABIC → refinery; STC → telecom; NEOM → coastal development; Archer Offshore → offshore platform; general sector fallbacks verified.
