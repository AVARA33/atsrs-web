# Google OAuth production contract

This configuration is external to normal website deployments. Do not replace it while changing ATSRS pages or UI.

## Verified production values

- Google Cloud project: `atsrs-501617`
- App name: `ATSRS`
- Publishing status: `In production`
- Branding status: verified and shown to users
- Application home page: `https://atsrs.com/`
- Privacy policy: `https://atsrs.com/privacy.html`
- Terms of service: `https://atsrs.com/terms.html`
- Authorized domains: `atsrs.com`, `hwtjuqyxzivymofamwxl.supabase.co`
- JavaScript origin: `https://atsrs.com`
- OAuth callback: `https://hwtjuqyxzivymofamwxl.supabase.co/auth/v1/callback`
- Scopes: standard identity only (OpenID, email, profile); no sensitive or restricted scopes
- Search Console ownership: `atsrs.com` verified through Cloudflare DNS

The obsolete typo `hwtjuqyxziyvmofamwxl.supabase.co` must never be restored.

## Deployment protection

`scripts/build-cloudflare-pages.mjs` stops a deployment if the canonical ATSRS domain, Supabase project origin, Google provider, account chooser, CNAME, Privacy page, or Terms page no longer matches this contract. The external Google Cloud and Search Console settings are not changed by a website deployment.

If the domain, Supabase project, or legal-page URLs are intentionally migrated, update Google Auth Platform, Supabase Auth redirect allow-list, Search Console/DNS, this document, and the build guard together in one reviewed change.
