import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type { TaxChecklistItem } from "@/lib/business-office/types";

const DEFAULT_ITEMS: TaxChecklistItem[] = [
  {
    key: "transactions_reviewed",
    label: "Transactions reviewed",
    completed: false,
  },
  { key: "receipts_attached", label: "Receipts attached", completed: false },
  { key: "income_reconciled", label: "Income reconciled", completed: false },
  {
    key: "expenses_categorized",
    label: "Expenses categorized",
    completed: false,
  },
  {
    key: "contractor_w9s",
    label: "Contractor W-9s collected",
    completed: false,
  },
  {
    key: "payroll_reviewed",
    label: "Payroll preparation reviewed",
    completed: false,
  },
  {
    key: "invoices_reconciled",
    label: "Invoices reconciled",
    completed: false,
  },
  {
    key: "accountant_package",
    label: "Accountant package exported",
    completed: false,
  },
];

function normalizeItems(value: unknown): TaxChecklistItem[] {
  if (!Array.isArray(value)) return DEFAULT_ITEMS;
  const incoming = new Map(
    value
      .filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object"),
      )
      .map((item) => [String(item.key ?? ""), Boolean(item.completed)]),
  );
  return DEFAULT_ITEMS.map((item) => ({
    ...item,
    completed: incoming.get(item.key) ?? false,
  }));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const url = new URL(request.url);
  const taxYear =
    Number(url.searchParams.get("year")) || new Date().getUTCFullYear();
  const quarter = Number(url.searchParams.get("quarter")) || 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_tax_checklists")
    .select("id,tax_year,quarter,checklist,notes,completed_items,total_items")
    .eq("user_id", user.id)
    .eq("tax_year", taxYear)
    .eq("quarter", quarter)
    .is("workspace_id", null)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "tax_checklist_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    checklist: data
      ? { ...data, checklist: normalizeItems(data.checklist) }
      : {
          id: null,
          tax_year: taxYear,
          quarter,
          checklist: DEFAULT_ITEMS,
          notes: null,
          completed_items: 0,
          total_items: DEFAULT_ITEMS.length,
        },
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const taxYear = Number(body?.taxYear) || new Date().getUTCFullYear();
  const quarter = Number(body?.quarter) || 0;
  if (taxYear < 2000 || taxYear > 2200 || quarter < 0 || quarter > 4) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_tax_period" } },
      { status: 400 },
    );
  }
  const items = normalizeItems(body?.checklist);
  const values = {
    checklist: items,
    notes: String(body?.notes ?? "").trim() || null,
    completed_items: items.filter((item) => item.completed).length,
    total_items: items.length,
  };
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("business_tax_checklists")
    .select("id")
    .eq("user_id", user.id)
    .eq("tax_year", taxYear)
    .eq("quarter", quarter)
    .is("workspace_id", null)
    .maybeSingle();
  if (readError) {
    return NextResponse.json(
      { ok: false, error: { code: "tax_checklist_unavailable" } },
      { status: 503 },
    );
  }
  const result = existing?.id
    ? await supabase
        .from("business_tax_checklists")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select("*")
        .single()
    : await supabase
        .from("business_tax_checklists")
        .insert({
          user_id: user.id,
          tax_year: taxYear,
          quarter,
          ...values,
        })
        .select("*")
        .single();
  if (result.error) {
    return NextResponse.json(
      { ok: false, error: { code: "tax_checklist_save_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, checklist: result.data });
}
