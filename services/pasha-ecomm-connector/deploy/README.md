# Hardened connector host template

This directory is a reviewable template, not a deployed configuration. Keep
`ATSRS_BILLING_ENABLED=false` until bank staging certification and security
review are complete.

- Use a dedicated supported Linux host and a dedicated static public IPv4.
- Bind Node to `127.0.0.1`; expose only TCP 443 through the reverse proxy.
- Restrict inbound 443 to the documented Supabase egress ranges if a stable
  supported range is available; otherwise retain HMAC, nonce replay protection,
  TLS, request limits and rate limits. Allow outbound DNS, time sync, package
  mirrors during maintenance, and the exact PAŞA endpoint only.
- Store the connector environment and mTLS files under `/etc/atsrs-pasha` with
  owner-only permissions. Store durable state at
  `/var/lib/atsrs-pasha/state.json`; back it up and never run two connectors
  against different state files.
- Logs must include only request outcome, safe error code and correlation ID.
  Never log HMACs, secrets, certificates, private keys, raw bank payloads or
  cardholder data.
- The HMAC secret must contain at least 32 random bytes. Rotate with key IDs and
  overlap: add the new key beside the old key in
  `CONNECTOR_SHARED_SECRETS_JSON`, restart the connector, switch Supabase
  `PASHA_CONNECTOR_HMAC_KEY_ID` and `PASHA_CONNECTOR_SHARED_SECRET` to the new
  key, verify traffic, then remove the old key and restart. Never reuse a key ID
  for different bytes. Rotate TLS/mTLS certificates under the same documented
  two-person procedure. Restart only after the durable state volume is mounted.
- Before production: test replay after restart, concurrent idempotent requests,
  uncertain bank timeouts, callback races, certificate expiry alerts, NTP,
  backup restore and fail-closed behavior.
- Run `node preflight.mjs` on the hardened host before starting or restarting
  the service. It validates the loopback bind, approved PAŞA endpoint, confirmed
  amount convention, bounded rotation keyring, absolute protected paths,
  certificate/private-key match, minimum certificate lifetime and Unix key/state
  permissions without printing secret values.

The supplied systemd sandbox needs read-only access to application and secret
paths and write access only to `/var/lib/atsrs-pasha`. Adapt paths and the exact
hostname after the host and bank contract are approved.

For the currently recommended DigitalOcean option, follow
`digitalocean-provisioning-checklist.md`. In particular, prove that outbound
traffic uses the Reserved IPv4 before supplying it to PAŞA Bank; merely
assigning the address does not change the connector's outbound source route.
