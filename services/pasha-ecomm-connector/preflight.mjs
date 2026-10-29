import { createPrivateKey, createPublicKey, X509Certificate } from "node:crypto";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateConnectorKeyId, validateConnectorSecret } from "./protocol.mjs";

const DEFAULT_HANDLER = "https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler";

function required(env, name) {
  const value = String(env[name] ?? "").trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function exactHttpsUrl(value, code) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${code}_INVALID`); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error(`${code}_INVALID`);
  }
  return url.href;
}

function keyring(env) {
  const raw = required(env, "CONNECTOR_SHARED_SECRETS_JSON");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("CONNECTOR_KEYRING_INVALID"); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("CONNECTOR_KEYRING_INVALID");
  }
  const entries = Object.entries(parsed);
  if (entries.length < 1 || entries.length > 5) throw new Error("CONNECTOR_KEYRING_SIZE_INVALID");
  for (const [id, secret] of entries) {
    validateConnectorKeyId(id);
    validateConnectorSecret(secret);
  }
  return entries.map(([id]) => id);
}

function requiredAbsolutePath(env, name) {
  const value = required(env, name);
  if (!isAbsolute(value)) throw new Error(`${name}_NOT_ABSOLUTE`);
  return resolve(value);
}

export function validateConnectorEnvironment(env = process.env) {
  if (String(env.BIND_HOST ?? "127.0.0.1").trim() !== "127.0.0.1") {
    throw new Error("BIND_HOST_NOT_LOOPBACK");
  }
  const port = Number(String(env.PORT ?? "8080").trim());
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT_INVALID");
  if (!/^\d{1,32}$/.test(required(env, "PASHA_MERCHANT_ID"))) throw new Error("PASHA_MERCHANT_ID_INVALID");
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(required(env, "PASHA_TERMINAL_ID"))) throw new Error("PASHA_TERMINAL_ID_INVALID");
  if (required(env, "PASHA_AMOUNT_FORMAT") !== "minor-units-confirmed") {
    throw new Error("PASHA_AMOUNT_FORMAT_NOT_CONFIRMED");
  }

  const handler = exactHttpsUrl(String(env.PASHA_MERCHANT_HANDLER_URL ?? DEFAULT_HANDLER).trim(), "MERCHANT_HANDLER");
  const allowlist = required(env, "PASHA_ALLOWED_MERCHANT_HANDLER_URLS")
    .split(",").map((value) => exactHttpsUrl(value.trim(), "MERCHANT_HANDLER_ALLOWLIST"));
  if (!allowlist.includes(handler)) throw new Error("MERCHANT_HANDLER_NOT_ALLOWED");
  if (!allowlist.every((value) => value === DEFAULT_HANDLER)) throw new Error("MERCHANT_HANDLER_ALLOWLIST_UNAPPROVED");

  return {
    port,
    handler,
    keyIds: keyring(env),
    statePath: requiredAbsolutePath(env, "CONNECTOR_STATE_PATH"),
    clientCertPath: requiredAbsolutePath(env, "PASHA_CLIENT_CERT_PATH"),
    clientKeyPath: requiredAbsolutePath(env, "PASHA_CLIENT_KEY_PATH"),
    caCertPath: requiredAbsolutePath(env, "PASHA_CA_CERT_PATH"),
  };
}

function regularFile(path, code) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`${code}_NOT_REGULAR_FILE`);
  return info;
}

export function validateConnectorFiles(config, now = Date.now()) {
  regularFile(config.clientCertPath, "PASHA_CLIENT_CERT");
  const keyInfo = regularFile(config.clientKeyPath, "PASHA_CLIENT_KEY");
  regularFile(config.caCertPath, "PASHA_CA_CERT");
  if (process.platform !== "win32" && (keyInfo.mode & 0o077) !== 0) {
    throw new Error("PASHA_CLIENT_KEY_PERMISSIONS_UNSAFE");
  }
  const stateDirectory = statSync(dirname(config.statePath));
  if (!stateDirectory.isDirectory()) throw new Error("CONNECTOR_STATE_DIRECTORY_INVALID");
  if (process.platform !== "win32" && (stateDirectory.mode & 0o077) !== 0) {
    throw new Error("CONNECTOR_STATE_DIRECTORY_PERMISSIONS_UNSAFE");
  }

  const certificate = new X509Certificate(readFileSync(config.clientCertPath));
  const caCertificate = new X509Certificate(readFileSync(config.caCertPath));
  const privateKey = createPrivateKey(readFileSync(config.clientKeyPath));
  const certKey = certificate.publicKey.export({ type: "spki", format: "der" });
  const privatePublicKey = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  if (!certKey.equals(privatePublicKey)) throw new Error("PASHA_CERTIFICATE_KEY_MISMATCH");
  const minimumValidity = now + 30 * 24 * 60 * 60 * 1000;
  if (Date.parse(certificate.validTo) <= minimumValidity) throw new Error("PASHA_CLIENT_CERTIFICATE_EXPIRING");
  if (Date.parse(caCertificate.validTo) <= minimumValidity) throw new Error("PASHA_CA_CERTIFICATE_EXPIRING");
  return { clientCertificateExpiresAt: certificate.validTo, caCertificateExpiresAt: caCertificate.validTo };
}

export function runConnectorPreflight(env = process.env) {
  const config = validateConnectorEnvironment(env);
  const certificates = validateConnectorFiles(config);
  return { ok: true, keyCount: config.keyIds.length, ...certificates };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = runConnectorPreflight();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "CONNECTOR_PREFLIGHT_FAILED");
    process.exitCode = 1;
  }
}
