# ATSRS Cloudflare Pages deployment

This runbook moves only the ATSRS frontend to Cloudflare Pages. Supabase remains the backend for Postgres, Auth, Storage and Edge Functions.

## Pages project settings

- Repository: `AVARA33/atsrs-web`
- Production branch: `main`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: repository root

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
