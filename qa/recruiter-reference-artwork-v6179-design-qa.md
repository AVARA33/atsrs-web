# Recruiter reference artwork V6179 design QA

- Scope: recruiter card background artwork and deterministic company/role mapping only.
- Reference: user-supplied recruiter mock with world map, offshore platform, refinery, vessel, architecture, hospitality, and laboratory scenes.
- Dark mode: passed on live V6179; all four reference palettes and subjects are visible, with text and actions remaining clear.
- Light mode: passed on live V6179 at artwork opacity `.38`; pale overlays preserve artwork while keeping text readable.
- Responsive/card dimensions: unchanged by implementation; automated regression coverage passed.
- Functional controls/data: unchanged.
- Live mapping verified: Darwin/general → global network; Airswift/Halliburton → offshore platform; SLB/Worley/Siemens/ASSYSTEM → refinery; Orion → offshore vessel; AECOM → architecture.
- Automated tests: 20 passed; Cloudflare build produced 484 files.
