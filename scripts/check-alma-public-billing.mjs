import assert from "node:assert/strict";
import fs from "node:fs";
import { createJiti } from "jiti";

const read = (file) => fs.readFileSync(file, "utf8");
const jiti = createJiti(import.meta.url);
const { normalizeBillingPlan, publicPlanName } = jiti(
  "../lib/billing/plans.ts",
);
const { checkoutContinuation, loginContinuation } = jiti(
  "../lib/billing/continuation.ts",
);
const { shouldApplyStripeEvent } = jiti("../lib/billing/webhook.ts");

assert.equal(normalizeBillingPlan("essential"), "starter");
assert.equal(normalizeBillingPlan("autonomous"), "business");
assert.equal(normalizeBillingPlan("enterprise"), null);
assert.equal(publicPlanName("starter"), "essential");
assert.equal(publicPlanName("business"), "autonomous");
assert.deepEqual(checkoutContinuation("?plan=essential&next=/billing"), {
  plan: "starter",
  next: "/billing",
});
assert.deepEqual(
  checkoutContinuation("?plan=business&next=https://evil.test"),
  { plan: "business", next: "/dashboard" },
);
assert.equal(
  loginContinuation("?plan=starter&next=/billing"),
  "/billing?checkout=starter",
);
assert.equal(shouldApplyStripeEvent(200, 199), false);
assert.equal(shouldApplyStripeEvent(200, 200), true);
assert.equal(shouldApplyStripeEvent(null, 1), true);

const home = read("components/marketing/PublicAlmaSandbox.tsx");
for (const workflow of [
  "office",
  "communications",
  "planner",
  "creator",
  "builder",
])
  assert.match(home, new RegExp(`\\b${workflow}:`));
for (const forbidden of [
  "/api/",
  "fetch(",
  "sent successfully",
  "deployed successfully",
])
  assert.ok(
    !home.includes(forbidden),
    `Anonymous sandbox contains ${forbidden}`,
  );
assert.match(home, /useAlmaLocale/);
assert.match(home, /motion-safe:/);
assert.match(home, /aria-live=/);

const page = read("app/page.tsx");
assert.equal((page.match(/<PublicAlmaSandbox\s*\/>/g) ?? []).length, 1);
assert.ok(!page.includes("AlmaHeroReplay"));

const checkout = read("app/api/billing/checkout/route.ts");
for (const required of [
  "normalizeBillingPlan",
  "idempotencyKey",
  "resolveTenantWorkspace",
  "customer_email",
  "subscription_data",
])
  assert.match(checkout, new RegExp(required));
const webhook = read("app/api/billing/webhook/route.ts");
for (const event of [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
])
  assert.match(webhook, new RegExp(event.replaceAll(".", "\\.")));
for (const required of [
  "constructEvent",
  "stripe_webhook_events",
  "shouldApplyStripeEvent",
])
  assert.match(webhook, new RegExp(required));

const migration = read(
  "supabase/migrations/20260720002000_alma_subscription_authority.sql",
);
for (const required of [
  "stripe_webhook_events",
  "last_stripe_event_created",
  "payment_failed_at",
  "enable row level security",
  "revoke insert, update, delete",
])
  assert.match(migration, new RegExp(required));
const registry = read("lib/platform/modules/registry.ts");
for (const moduleKey of [
  "tasks",
  "planner",
  "notes",
  "documents",
  "crm",
  "invoicing",
  "translator",
])
  assert.match(
    registry,
    new RegExp(`key: "${moduleKey}"[\\s\\S]*?requiredPlan: "starter"`),
  );
for (const moduleKey of ["office", "creative_studio", "builder", "voice"])
  assert.match(
    registry,
    new RegExp(`key: "${moduleKey}"[\\s\\S]*?requiredPlan: "business"`),
  );
const paidGuard = read("lib/api/requirePaidUser.ts");
assert.match(paidGuard, /EntitlementService\.checkModuleAccess/);
assert.match(paidGuard, /process\.env\.NODE_ENV !== "production"/);
for (const [route, moduleKey] of [
  ["app/api/tasks/create/route.ts", "tasks"],
  ["app/api/notes/create/route.ts", "notes"],
  ["app/api/planner/add/route.ts", "planner"],
  ["app/api/documents/create/route.ts", "documents"],
  ["app/api/crm/create/route.ts", "crm"],
  ["app/api/invoices/create/route.ts", "invoicing"],
  ["app/api/creative/generate/route.ts", "creative_studio"],
  ["app/api/images/generate/route.ts", "images"],
])
  assert.match(read(route), new RegExp(`requirePaidUser\\("${moduleKey}"\\)`));

for (const root of ["app", "components"]) {
  for (const file of fs.readdirSync(root, { recursive: true })) {
    const path = `${root}/${file}`;
    if (
      typeof file === "string" &&
      /\.(ts|tsx)$/.test(file) &&
      fs.existsSync(path) &&
      read(path).startsWith('"use client"')
    )
      assert.doesNotMatch(
        read(path),
        /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY/,
        `Client secret reference in ${path}`,
      );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code: "ALMA_PUBLIC_BILLING_CHECK_PASSED",
      workflows: 5,
      externalRequests: false,
    },
    null,
    2,
  ),
);
