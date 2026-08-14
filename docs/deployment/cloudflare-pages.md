# ATSRS Cloudflare Pages deployment

This runbook moves only the ATSRS frontend to Cloudflare Pages. Supabase remains the backend for Postgres, Auth, Storage and Edge Functions.

## Pages project settings

- Repository: `AVARA33/atsrs-web`
- Production branch: `main`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: repository root
- Preview URL: `https://atsrs-web-preview.pages.dev`

The build intentionally publishes only the public HTML files and the `assets`, `css`, `js` and `vendor` directories. It excludes audits, tests, scripts, backups, Supabase migrations and the GitHub Pages `CNAME` file.

## Safe rollout order

1. Run `npm run build:cloudflare` locally and complete the regression tests.
2. Import the GitHub repository into Cloudflare Pages without changing DNS.
3. Test the generated `*.pages.dev` preview in light and dark mode on desktop, tablet and 390 px mobile.
4. Confirm public landing, pricing, legal pages, login, signup, Google Auth return, authenticated refresh, Personal/Corporate switching, uploads and document previews.
5. Check browser console errors, keyboard focus, text clipping and horizontal overflow.
6. Record the current `atsrs.com` DNS records and GitHub Pages state.
7. Only after the preview passes, attach `atsrs.com` and `www.atsrs.com` to the Pages project.

Because the final public origin remains `https://atsrs.com`, the existing application URL can remain unchanged. Before DNS cutover, verify that Supabase Auth still allows the production origin and the exact callback paths used by ATSRS.

## Rollback

- For an application regression, select the previous successful Cloudflare Pages deployment.
- For a platform or DNS issue, restore the recorded pre-cutover DNS records to the existing GitHub Pages deployment.
- Do not delete the GitHub Pages configuration or `CNAME` until the Cloudflare deployment has been stable and explicitly approved.

No production user data is copied, altered or deleted during this frontend migration.

## Recorded pre-cutover state (historical rollback record)

Recorded on 11 August 2026 before any production DNS change:

- `atsrs.com` A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `www.atsrs.com` CNAME: `avara33.github.io`
- At the time of this record, the public production origin remained GitHub Pages.
- At the time of this record, Cloudflare Pages was preview-only and no custom domain was attached.

This is the rollback target if a later custom-domain cutover has to be reversed.

## Current production state

Verified on 14 August 2026:

- `https://atsrs.com` is served through Cloudflare and reports the same V533 build as the Pages preview.
- `https://atsrs-web-preview.pages.dev` is the active Cloudflare Pages preview origin.
- The repository contains no Pages Functions directory, `_worker.js`, `_routes.json`, Wrangler configuration, or repository-owned KV, R2, D1, Durable Object or Queue binding configuration.
- Supabase remains the application backend for Auth, Postgres, Storage and Edge Functions.
- A separately managed `atsrs-api` Worker may exist outside this repository. Its routes, bindings and production use cannot be proved from repository evidence, so it must not be removed without owner review in Cloudflare.

## Preview verification record

Verified on 11 August 2026:

- Landing, login, pricing, privacy, terms, security and data-protection routes load successfully.
- Canonical extensionless legal and pricing routes render the expected page titles and headings.
- No desktop horizontal overflow was detected on the verified public routes.
- Login uses exactly one viewport height and does not create an extra page scroll.
- Light and dark theme switching works without console errors.
- Public-route browser console errors: 0.
- Local regression suite: 57 passed, 0 failed.

Core Web Vitals were not recorded because the Chrome DevTools performance MCP is not installed on this workstation. Do not treat the checks above as a performance trace.
