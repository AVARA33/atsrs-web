# DigitalOcean provisioning checklist (not executed)

This is the reviewed deployment sequence for the recommended ATSRS PAŞA Bank
connector host. It does not authorize a purchase or a production cutover.

## Resource selection

- Basic Droplet, 2 GiB RAM / 1 vCPU / 50 GiB SSD, Ubuntu LTS, EU region.
- Assign one Reserved IPv4 in the same datacenter.
- Enable account MFA, automatic security updates, monitoring and backups before
  any merchant material is copied.
- Record the Droplet ID, region, Reserved IPv4 and system owner in the internal
  infrastructure register. Do not record secrets there.

## Network invariant required by PAŞA Bank

The IP supplied to PAŞA Bank must be the actual **outbound source IPv4** of the
connector. Assigning a Reserved IPv4 is not sufficient by itself. Configure the
Droplet's default route through the Reserved IPv4 anchor gateway using the
current DigitalOcean procedure, persist it across reboot, then verify the
observed outbound IPv4 before and after a reboot. Do not send an IP to the bank
until both observations match the Reserved IPv4.

Official procedure:
https://docs.digitalocean.com/products/networking/reserved-ips/how-to/outbound-traffic/

## Host hardening order

1. Create a non-root deployment account; disable password SSH and direct root
   login after key access is verified.
2. Apply host updates and enable time synchronization.
3. Configure the cloud firewall and host firewall: deny inbound by default;
   allow SSH only from the administrator source; allow public TCP 443 only for
   the connector endpoint. Never expose the Node listen port.
4. Install the application under `/opt/atsrs-pasha`; install the supplied
   systemd and Nginx templates only after replacing their placeholders.
5. Create `/etc/atsrs-pasha` and `/var/lib/atsrs-pasha` with the ownership and
   permissions required by the service template. Confirm the service cannot
   write outside its state directory.
6. Generate the connector HMAC keyring with at least 32 random bytes per key.
   Put secrets in the protected environment file, never in shell history,
   source control, tickets or logs.
7. Copy the merchant private key only after the hardened secret path exists.
   Install the bank-signed merchant certificate and PAŞA root chain only after
   their fingerprints/chain have been verified against bank documentation.
8. Bind the connector to `127.0.0.1`; terminate public TLS at Nginx; verify the
   16 KiB request cap, security headers, rate limits and exact path routing.
9. Keep `ATSRS_BILLING_ENABLED=false`; run health, replay, restart,
   idempotency, uncertain-registration and certificate-expiry tests.
10. Snapshot/backup the durable connector state and perform a restore drill.

## Evidence required before giving the IP to PAŞA Bank

- Outbound IPv4 equals the Reserved IPv4 before and after reboot.
- Only intended public ports are reachable.
- Connector process runs unprivileged and is loopback-only.
- State survives restart and restore; replay is rejected after restart.
- Logs contain no HMAC, private key, certificate bytes, raw bank payload or
  customer/card data.
- Certificate and secret file permissions pass the deployment checks.
- Cyber sign-off covers the final host configuration and merchant-key path.

The bank certification matrix and production enablement remain separate gates.
