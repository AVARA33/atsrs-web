# Profile Workspace Design QA

- Source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-81483fe1-1ae9-4aff-ad11-1a2d30fa7a66.png` (2048 × 814 px, desktop dark reference) and `C:\Users\user\AppData\Local\Temp\codex-clipboard-e1dd8d63-c58a-4d35-9c2e-2aa56d73a49d.png` (2048 × 814 px, annotated tab reference).
- Implementation evidence: `qa/profile-workspace-dark-desktop.png` (1920 × 1080), `qa/profile-workspace-light-desktop.png` (1920 × 1080), `qa/profile-workspace-dark-mobile-final.png` (390 × 844), `qa/profile-workspace-light-mobile.png` (390 × 844), and `qa/profile-workspace-sharing-dark-final.png` (1920 × 1080).
- Browser/state: production `https://atsrs.com/`, signed-in Personal Profile, Chrome, device scale factor 1, dark and light themes.
- Density normalization: source and implementation were reviewed at their native 1× screenshots; layout regions were compared by the app content rather than browser chrome.

## Full-view comparison

The approved Profile Summary, Work Availability, tab bar, settings viewport, Calendar and Account Status geometry remain intact. The four active tabs replace content only inside the left settings viewport; Calendar and Account Status remain in their grid positions. Typography, green/blue theme accents, border radii, surfaces, portrait crop and copy hierarchy remain consistent with the supplied production reference.

## Focused-region comparison

- Tab viewport: all four panels measured the same outer rectangle (difference 0 px during live switching).
- Sharing: the final dark screenshot confirms the prior blue surface is replaced by the standard near-black workspace surface.
- Mobile summary: the final 390 × 844 screenshot confirms the role and Verified badges wrap below the name without clipping.
- Images/assets: the existing real profile portrait and ATSRS branding are preserved; no replacement, placeholder or additional identity image was introduced.

## Findings and iteration history

1. P2 — Work Availability editor was initially nested inside the moved Personal editor.
   - Fix: resolve and move the live availability card after the profile grid relocation.
   - Post-fix evidence: live Edit availability exposes enabled Save/Cancel controls inside the same card while Summary and Calendar remain visible.
2. P2 — The mobile role badge clipped at 390 px.
   - Fix: force the name to its own flex row and constrain the role badge.
   - Post-fix evidence: `qa/profile-workspace-dark-mobile-final.png` shows the complete `Senior ROV Pilot` badge.
3. P2 — Sharing retained a blue inherited background layer in dark mode.
   - Fix: explicitly neutralize background images and apply the standard dark workspace surface to the Sharing panel, host and live panel.
   - Post-fix evidence: `qa/profile-workspace-sharing-dark-final.png` shows only near-black surfaces.

No actionable P0, P1 or P2 findings remain.

## Functional and accessibility checks

- Mouse tab switching: passed.
- Enter/Space and Left/Right Arrow bindings: contract-tested.
- Exactly one active tab panel and correct ARIA state: passed.
- Inline Edit Profile / Cancel with Summary, Availability and Calendar retained: passed.
- Inline Work Availability / Cancel with stable card context: passed.
- Legacy account tabs and editor visibility: absent on Personal Profile.
- Existing Privacy, Sharing and Security live controls: present in their new panels.
- Duplicate IDs: none.
- Horizontal overflow: none at 1920, 1440, 1280, 1024, 768 and 390 px checks.
- Console warnings/errors: none in final production checks.
- ID document filename no longer creates a Verified result; no new identity upload or summary card was added.

## Residual test note

The repository-wide test command still includes pre-existing stale version-contract failures unrelated to this change. Focused Profile, edit-lock, sharing and build gates pass.

final result: passed
