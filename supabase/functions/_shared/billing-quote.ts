import type { AtsrsPlanKey, BillingCycle } from "./payment-provider.ts";

export type BillingQuote = {
  version: number;
  userId: string;
  planKey: AtsrsPlanKey;
  billingCycle: BillingCycle;
  amountMinor: number;
  currency: string;
  catalogVersion: number;
  expiresAt: number;
};

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("BILLING_QUOTE_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function key(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export async function signBillingQuote(quote: BillingQuote, secret: string) {
  if (secret.length < 32) throw new Error("BILLING_QUOTE_SECRET_WEAK");
  const payload = base64Url(encoder.encode(JSON.stringify(quote)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret, ["sign"]), encoder.encode(payload)));
  return `${payload}.${base64Url(signature)}`;
}

export async function verifyBillingQuote(token: string, secret: string, now = Date.now()): Promise<BillingQuote> {
  if (secret.length < 32 || token.length > 4096) throw new Error("BILLING_QUOTE_INVALID");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("BILLING_QUOTE_INVALID");
  const valid = await crypto.subtle.verify(
    "HMAC", await key(secret, ["verify"]), decodeBase64Url(signature), encoder.encode(payload),
  );
  if (!valid) throw new Error("BILLING_QUOTE_INVALID");
  const quote = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as BillingQuote;
  if (!quote || quote.version !== 1 || !Number.isSafeInteger(quote.expiresAt) || quote.expiresAt < now ||
      quote.expiresAt > now + 11 * 60_000 || !Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0 ||
      !Number.isSafeInteger(quote.catalogVersion) || quote.catalogVersion < 1 ||
      !/^[0-9a-f-]{36}$/i.test(quote.userId) || !/^[A-Z]{3}$/.test(quote.currency)) {
    throw new Error("BILLING_QUOTE_INVALID");
  }
  return quote;
}
