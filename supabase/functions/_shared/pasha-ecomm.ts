import type {
  CheckoutRequest,
  CheckoutResult,
  PaymentProvider,
  VerifiedWebhook,
  ProviderPaymentState,
  RefundRequest,
  RefundResult,
} from "./payment-provider.ts";
import {
  normalizePashaResult,
  pashaAmountMinor,
  pashaClientRedirectUrl,
  pashaCurrencyCode,
  pashaLanguage,
} from "./pasha-ecomm-protocol.mjs";

type ConnectorCheckoutResponse = { transaction_id?: unknown };
type ConnectorResultResponse = {
  transaction_id?: unknown;
  result?: unknown;
  result_code?: unknown;
  rrn?: unknown;
};

export type PashaCompletion = {
  providerOrderReference: string;
  providerPaymentReference?: string;
  paymentStatus: "pending" | "paid" | "failed" | "canceled";
  safeFailureCode?: string;
};

const CONNECTOR_TIMEOUT_MS = 15_000;

function requiredEnv(name: string) {
  const value = (Deno.env.get(name) ?? "").trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function connectorBaseUrl() {
  const url = new URL(requiredEnv("PASHA_CONNECTOR_URL"));
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("PASHA_CONNECTOR_URL_INSECURE");
  }
  return url;
}

function transactionId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9+/=_-]{8,512}$/.test(id)) throw new Error("PASHA_TRANSACTION_ID_INVALID");
  return id;
}

async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function connectorPost(path: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const connectorSecret = requiredEnv("PASHA_CONNECTOR_SHARED_SECRET");
  if (new TextEncoder().encode(connectorSecret).byteLength < 32) throw new Error("PASHA_CONNECTOR_SHARED_SECRET_WEAK");
  const keyId = requiredEnv("PASHA_CONNECTOR_HMAC_KEY_ID");
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) throw new Error("PASHA_CONNECTOR_KEY_ID_INVALID");
  const signature = await hmacHex(
    connectorSecret,
    `${timestamp}.${nonce}.${body}`,
  );
  const target = new URL(path, connectorBaseUrl());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTOR_TIMEOUT_MS);
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ATSRS-Timestamp": timestamp,
        "X-ATSRS-Nonce": nonce,
        "X-ATSRS-Key-Id": keyId,
        "X-ATSRS-Signature": `sha256=${signature}`,
      },
      body,
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`PASHA_CONNECTOR_HTTP_${response.status}`);
    const text = await response.text();
    if (text.length > 16_384) throw new Error("PASHA_CONNECTOR_RESPONSE_TOO_LARGE");
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export class PashaEcommProvider implements PaymentProvider {
  readonly key = "pasha-ecomm";

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const response = await connectorPost("/v1/payments/register", {
      merchant_transaction_id: request.transactionId,
      idempotency_key: request.idempotencyKey,
      amount_minor: pashaAmountMinor(request.amountMinor),
      currency: request.currency.toUpperCase(),
      currency_numeric: pashaCurrencyCode(request.currency),
      client_ip_addr: request.clientIpAddress,
      description: `ATSRS ${request.planKey} ${request.billingCycle}`.slice(0, 125),
      language: pashaLanguage(request.language),
      terminal_id: requiredEnv("PASHA_ECOMM_TERMINAL_ID"),
      msg_type: "SMS",
    }) as ConnectorCheckoutResponse;
    const providerOrderReference = transactionId(response.transaction_id);
    return {
      providerOrderReference,
      redirectUrl: pashaClientRedirectUrl(
        requiredEnv("PASHA_ECOMM_CLIENT_HANDLER_URL"),
        providerOrderReference,
        (Deno.env.get("PASHA_ECOMM_ALLOWED_CLIENT_HANDLER_URLS") ??
          "https://ecomm.pashabank.az:8463/ecomm2/ClientHandler")
          .split(",").map((value) => value.trim()).filter(Boolean),
      ),
    };
  }

  async completeCheckout(providerOrderReference: string, clientIpAddress: string): Promise<PashaCompletion> {
    const safeTransactionId = transactionId(providerOrderReference);
    const response = await connectorPost("/v1/payments/result", {
      transaction_id: safeTransactionId,
      client_ip_addr: clientIpAddress,
    }) as ConnectorResultResponse;
    if (transactionId(response.transaction_id) !== safeTransactionId) {
      throw new Error("PASHA_TRANSACTION_ID_MISMATCH");
    }
    const normalized = normalizePashaResult(response.result, response.result_code);
    const rrn = typeof response.rrn === "string" && /^[A-Za-z0-9]{1,32}$/.test(response.rrn)
      ? response.rrn
      : undefined;
    return {
      providerOrderReference: safeTransactionId,
      providerPaymentReference: rrn,
      paymentStatus: normalized.paymentStatus,
      safeFailureCode: normalized.safeFailureCode,
    };
  }

  verifyWebhook(_rawBody: Uint8Array, _headers: Headers): Promise<VerifiedWebhook> {
    return Promise.reject(new Error("PASHA_WEBHOOK_NOT_SUPPORTED"));
  }

  getPayment(_providerOrderReference: string): Promise<ProviderPaymentState> {
    return Promise.reject(new Error("PASHA_PAYMENT_LOOKUP_UNSUPPORTED"));
  }

  createRefund(_request: RefundRequest): Promise<RefundResult> {
    return Promise.reject(new Error("PASHA_REFUND_NOT_ENABLED"));
  }
}
