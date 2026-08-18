# ATSRS Developer Editor operations

## Security model

`developer_editor` is a server-managed role stored in `atsrs_developer_memberships`. The browser never assigns or trusts the role locally. All repository operations pass through `developer-editor-actions`, which revalidates the Supabase user, membership status, MFA `aal2`, change ownership, branch namespace and every changed path.

The public `/developer/` page initially renders only a neutral access gate. The workspace template is instantiated only after a successful server role check and MFA verification. Source visibility is not a security boundary; the Edge broker and GitHub App are authoritative.

## Required GitHub App (Owner action)

Create a dedicated GitHub App installed only on `AVARA33/atsrs-web`. Do not use a personal access token.

Repository permissions:

- Metadata: read (required by GitHub)
- Contents: read and write
- Pull requests: read and write
- Actions: read and write

No organization administration, secrets, environments, members, issues or webhook permissions are required. Install it only on the ATSRS repository.

Set these Supabase Edge secrets in staging first, then production after the staging workflow passes:

- `ATSRS_GITHUB_APP_ID`
- `ATSRS_GITHUB_APP_PRIVATE_KEY` (PKCS#8 PEM, `BEGIN PRIVATE KEY`; convert the downloaded GitHub RSA key offline before storing it)
- `ATSRS_GITHUB_INSTALLATION_ID`
- `ATSRS_GITHUB_REPOSITORY_OWNER=AVARA33`
- `ATSRS_GITHUB_REPOSITORY_NAME=atsrs-web`

Never place these values in Git, browser storage, build output or screenshots.

## Branch and deployment model

Each change receives a unique `developer-editor/<user>/<slug>-<id>` branch from current `main`. Browser saves become controlled GitHub Contents API commits on that branch. The user cannot execute arbitrary Git commands.

`developer-editor-checks.yml` runs with read-only repository permissions and no project secrets. It validates the isolated branch, focused regressions and production build. The broker accepts a PASS only when the run head SHA equals the current change head SHA.

Low-risk changes create a pull request and squash-merge only after exact scope and check validation. Owner-required changes stop at `approval_requested`. Owner approval performs the merge. Every merge dispatches `developer-editor-post-deploy.yml`, which waits for changed public assets to match the deployed commit and verifies the main and Developer routes.

Eligible low-risk rollback dispatches `developer-editor-rollback.yml` on `main`. The workflow revalidates that the source commit touched only the low-risk allowlist, creates a separate rollback branch and opens a pull request. It never rewrites history or rolls back unrelated changes.

## Exact path classes

Server authority is `supabase/functions/_shared/developer-editor-policy.ts`.

Low risk:

- `css/{jobs-prototype,talent-directory,projects,documents,references,dashboard,account,cv-generator}.css`
- the exact approved fixture HTML patterns listed in policy
- the exact approved focused test files listed in policy

Owner approval required (editable, never independently publishable):

- `js/{jobs-prototype,talent-directory,projects,documents,references,dashboard,account,cv-generator}.js`
- `index.html`

Denied includes `.env*`, `.github/**`, `supabase/**`, `scripts/**`, `docs/**`, `vendor/**`, `assets/**`, package/lock files, `_headers`, `CNAME`, auth/storage/server/security JS, global/base/theme/workspace CSS and secret-like paths.

## Invite and revocation

Owner opens `/developer/` with an ATSRS owner session and verified TOTP, then uses Developer Access. Existing ATSRS accounts can be assigned; otherwise Supabase sends an invite to the supplied email. The account remains `invited` until Owner activates it.

Disable or Revoke increments `session_revision` and changes the authoritative membership status. Since every Edge request re-reads status, Developer privileges end immediately without deleting the person's separate Personal/Corporate ATSRS account. Audit history and deployed code remain intact.

## Fail-closed states

- Missing GitHub App configuration: `DEVELOPER_GITHUB_NOT_CONFIGURED`
- Path outside scope: `DEVELOPER_SCOPE_VIOLATION`
- Missing exact PASS: `PUBLISH_BLOCKED`
- Shared/protected conflict: `DEVELOPER_EDITOR_BLOCKED_BY_MAIN`
- Missing verified TOTP: `MFA_REQUIRED`

Do not override these states manually in the database.
