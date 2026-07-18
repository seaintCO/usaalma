import { readFileSync } from "node:fs";

const checks = [
  {
    file: "supabase/migrations/20260718003000_alma_office_core.sql",
    required: [
      "create table if not exists public.office_profiles",
      "create table if not exists public.office_services",
      "create table if not exists public.office_projects",
      "create table if not exists public.office_estimates",
      "create table if not exists public.office_estimate_line_items",
      "create table if not exists public.office_estimate_attachments",
      "create table if not exists public.office_estimate_status_history",
      "enable row level security",
      "office_user_has_workspace",
      "assert_office_ownership",
      "assert_office_estimate_child_ownership",
    ],
  },
  {
    file: "lib/office/calculations.ts",
    required: [
      "calculateOfficeEstimate",
      "quantity",
      "unitRate",
      "depositAmount",
      "remainingBalance",
    ],
  },
  {
    file: "lib/office/repository.ts",
    required: [
      "OfficeRepository",
      "draftEstimate",
      "reviseEstimate",
      "replaceEstimateLines",
      "transitionEstimate",
      "convertEstimateToInvoice",
      "attachEstimateFile",
    ],
  },
  {
    file: "lib/ai/tools/registry.ts",
    required: [
      '"find_customer"',
      '"create_customer_draft"',
      '"find_services"',
      '"draft_estimate"',
      '"revise_estimate"',
      '"prepare_estimate_delivery"',
      '"convert_accepted_estimate_to_invoice"',
      '"prepare_deposit_request"',
      '"schedule_estimate_follow_up"',
    ],
  },
  {
    file: "lib/platform/actions/actionExecutorRegistry.ts",
    required: [
      '"office.estimate.deliver"',
      "OfficeRepository.markEstimateDelivered",
    ],
  },
  {
    file: "app/office/page.tsx",
    required: ["Overview", "Customers", "Estimates", "Invoices", "Price Book"],
  },
];

let failed = false;

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const needle of check.required) {
    if (!source.includes(needle)) {
      console.error(`${check.file}: missing ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log("Alma Office core checks passed.");
