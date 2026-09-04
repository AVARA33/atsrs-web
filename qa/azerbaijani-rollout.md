# Azerbaijani rollout — phase 1

Backup before localization: `C:/Users/user/Documents/GitHub/backups/before-azerbaijani-20260904-150659`.
Baseline live commit: `79c7faf`. Both live and dirty working sources archived; 2493 entries hash-verified. Restore instructions included. This is a source backup, not a hosted database/Auth/Storage export.

Completed: AZ/EN choice on public homepage and authentication card; homepage copy, plan summaries, FAQ answers, footer links, accessible descriptions, primary authentication labels, video titles and descriptions. New visitors default to AZ, explicit EN persists. Language is stored separately from legacy application state. Translation updates text/description attributes only, retains original DOM nodes, handlers, URLs, input values and plan names. Scoped observers disconnect during translation and do not observe the authenticated app.

Verified locally: AZ homepage; EN restoration; login/signup choice buttons translated; changing language retains expanded signup choices; AZ choice survives reload; back-home navigation; UTF-8 letters and video labels. Static JS syntax and build pass. No real registration, payment or credential submissions made.

Remaining phases (not complete): standalone pricing/contact/FAQ/legal pages; authenticated personal/corporate workspace, dialogs, notifications, validation/backend errors; exported documents/emails; image and video embedded copy/audio. This phase does not claim full Azerbaijani coverage or legal compliance. Original English remains the fallback.

For future edits update locales/az-phase1.tsv and regenerate js/locale-az.js as UTF-8. Broaden scope only after marking user content as excluded and verifying business controls whose option values or IDs must remain English. Never translate user-entered data or third-party vacancy text through DOM string replacement.
