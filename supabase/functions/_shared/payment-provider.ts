export type BillingCycle = "monthly" | "yearly";
export type AtsrsPlanKey = "bronze" | "silver" | "gold" | "titan";

export type CheckoutRequest = {
  transactionId: string;
  idempotencyKey: string;
  planKey: AtsrsPlanKey;
  billingCycle: BillingCycle;
  amountMinor: number;
  currency: string;
  customerReference: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  providerOrderReference: string;
  redirectUrl: string;
};

export type ProviderPaymentState = {
  providerOrderReference: string;
  providerPaymentReference?: string;
  merchantTransactionId: string;
  paymentStatus: NonNullable<VerifiedWebhook["paymentStatus"]>;
  amountMinor: number;
  currency: string;
  customerReference: string;
  environment: "test" | "live";
  occurredAt: string;
};

export type RefundRequest = {
  transactionId: string;
  providerPaymentReference: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
};

export type RefundResult = {
  providerRefundReference: string;
  status: "processing" | "succeeded";
};

export type VerifiedWebhook = {
  eventReference: string;
  eventType: string;
  providerOrderReference?: string;
  providerPaymentReference?: string;
  merchantTransactionId?: string;
  amountMinor?: number;
  currency?: string;
  merchantAccountReference?: string;
  customerReference?: string;
  environment?: "test" | "live";
  occurredAt?: string;
  paymentStatus?: "pending" | "authorized" | "paid" | "failed" | "canceled" | "expired" | "partially_refunded" | "refunded";
  safeFailureCode?: string;
};

export interface PaymentProvider {
  readonly key: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<VerifiedWebhook>;
  getPayment(providerOrderReference: string): Promise<ProviderPaymentState>;
  createRefund(request: RefundRequest): Promise<RefundResult>;
}

// Bank adapters are intentionally not guessed. A provider is returned only
// after its official merchant documentation, signing method and credentials
// are available and a concrete adapter has been reviewed.
export function resolvePaymentProvider(_configuredProvider: string): PaymentProvider | null {
  return null;
}

export function isPlanKey(value: unknown): value is AtsrsPlanKey {
  return value === "bronze" || value === "silver" || value === "gold" || value === "titan";
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
