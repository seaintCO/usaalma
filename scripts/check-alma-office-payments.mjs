import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const migration = read(
  "supabase/migrations/20260729003000_alma_office_payment_links.sql",
);
const paymentService = read("lib/payments/officePaymentLinks.ts");
const paypal = read("lib/payments/paypal.ts");
const stripeWebhook = read("app/api/payments/webhooks/stripe/route.ts");
const invoiceRoute = read("app/api/invoices/[id]/payment-link/route.ts");
const connections = read("app/connections/page.tsx");
const money = read("components/business-office/MoneyWorkspace.tsx");

for (const expected of [
  "office_payment_links",
  "office_payment_events",
  "public_token_hash",
  "provider_event_id",
  "enable row level security",
  "paypal_business",
  "stripe_connect",
]) {
  assert.ok(migration.includes(expected), `migration missing ${expected}`);
}

assert.ok(
  !paymentService.includes("publicToken,"),
  "payment service must not persist the raw public token",
);
assert.ok(
  paymentService.includes("payment_provider_not_connected"),
  "payment links must fail closed when the merchant is not connected",
);
assert.ok(
  paymentService.includes("payment_amount_mismatch"),
  "payment settlement must verify the amount",
);
assert.ok(
  paymentService.includes("provider_checkout_mismatch") &&
    paymentService.includes("provider_account_mismatch"),
  "payment settlement must verify the exact checkout and merchant account",
);
assert.ok(
  paymentService.includes("invoice_amount_changed"),
  "changed invoices must expire stale payment links",
);
assert.ok(
  paymentService.includes("idempotency_key"),
  "payment settlement must create an idempotent money record",
);
assert.ok(
  paypal.includes("/v2/checkout/orders"),
  "PayPal must use the official Orders v2 API",
);
assert.ok(
  paypal.includes("/v1/oauth2/token"),
  "PayPal credentials must be validated through OAuth authentication",
);
assert.ok(
  stripeWebhook.includes("constructEvent"),
  "Stripe webhook signatures must be verified",
);
assert.ok(
  stripeWebhook.includes("STRIPE_CONNECT_WEBHOOK_SECRET"),
  "Stripe Connect must use a dedicated webhook secret",
);
assert.ok(
  invoiceRoute.includes("getCurrentUser"),
  "invoice payment links must require authentication",
);
assert.ok(
  connections.includes('type="password"'),
  "PayPal secrets must use a password input",
);
assert.ok(
  money.includes("CashFlowChart") &&
    money.includes("CategoryBars") &&
    money.includes("InvoicePipeline"),
  "Money must render real insight components",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      check: "alma-office-payments",
      providers: ["stripe_connect", "paypal_business"],
      tracking: ["invoice", "payment_event", "business_transaction"],
    },
    null,
    2,
  ),
);
