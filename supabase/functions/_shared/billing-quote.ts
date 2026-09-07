import type { AtsrsPlanKey, BillingCycle } from "./payment-provider.ts";

export type BillingQuote = {
  userId: string;
  planKey: AtsrsPlanKey;
  billingCycle: BillingCycle;
  amountMinor: number;
  currency: string;
  catalogVersion: number;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function signBillingQuote(quote: BillingQuote, secret: string): Promise<string> {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify(quote)));
  return `${payload}.${base64Url(await hmac(secret, payload))}`;
}

export async function verifyBillingQuote(token: unknown, secret: string): Promise<BillingQuote | null> {
  if (typeof token !== "string" || token.length > 4096) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = await hmac(secret, payload);
    if (!constantTimeEqual(expected, decodeBase64Url(signature))) return null;
    const quote = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as BillingQuote;
    if (!quote || !Number.isSafeInteger(quote.expiresAt) || Date.now() > quote.expiresAt) return null;
    return quote;
  } catch {
    return null;
  }
}
