import { createPurchaseIntentStore, startPricingCheckout } from "./pricing-checkout-core.mjs";

const enabled = document.documentElement.dataset.billingEnabled === "true";
const consent = document.querySelector("[data-payment-terms]");
const buttons = Array.from(document.querySelectorAll("[data-pricing-checkout]"));

if (enabled && window.supabase) {
  window.supabaseClient ??= window.supabase.createClient(
    "https://hwtjuqyxzivymofamwxl.supabase.co",
    "sb_publishable_57xvbnJGp7pTXvfG11EdvA_Du_LvVyD",
    { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true } },
  );
  consent.disabled = false;
  const intents = createPurchaseIntentStore(window.sessionStorage);
  for (const button of buttons) {
    if (button.closest(".pricing-plan-future")) continue;
    button.disabled = false;
    button.setAttribute("aria-disabled", "false");
    button.classList.remove("pricing-action-disabled");
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        const cycle = document.querySelector("[data-pricing-cycle].active")?.dataset.pricingCycle === "yearly" ? "yearly" : "monthly";
        await startPricingCheckout({ client: window.supabaseClient, plan: button.dataset.pricingCheckout,
          cycle, accepted: consent.checked, language: document.documentElement.lang || "en", intentStore: intents });
      } catch (error) {
        console.error("ATSRS checkout did not start", error instanceof Error ? error.message : "BILLING_CHECKOUT_FAILED");
        window.alert("Checkout could not be started. No payment was taken. Please sign in and try again.");
      } finally { button.disabled = false; }
    });
  }
}
