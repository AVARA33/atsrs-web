# ATSRS Balance Helper — local prototype

Load this directory through Chrome's Extensions page → Developer mode → Load unpacked.
Then reload ATSRS and open Developer. The small round arrow beside Shared API balance performs a read-only check, separate from HR statistics Refresh.

## Privacy and limitations

- Runs only after a genuine click. No schedule, AI calls, paid API calls, cookies, credential access, payment actions, storage permissions or remote uploads.
- Opens one inactive billing tab, reads the visibly labelled API credit balance twice, and closes only its own tab.
- Requires an existing OpenAI login in the same browser profile. Captchas or expired logins require user intervention; the helper does not bypass them.
- Pins the observed HR project link. A different selected project/account fails closed; it is not silently substituted.
- Only the current Developer display is updated. The server snapshot, other devices and financial records are not changed. Refreshing the statistics restores the server snapshot until another balance check.
- Only atsrs.com and the exact OpenAI billing overview path have content scripts. No access to other websites.
- This is a fragile dashboard-reading integration, not an official balance API. A changed page layout or selected project will produce an error instead of an invented balance.
- Remove this extension from Chrome to revoke its access. Keep it disabled on shared browser profiles.
