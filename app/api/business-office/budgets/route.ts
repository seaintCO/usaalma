import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";

function month(value?: unknown) {
  const candidate =
    typeof value === "string" && /^\d{4}-\d{2}$/.test(value)
      ? value
      : new Date().toISOString().slice(0, 7);
  return `${candidate}-01`;
}

function schemaUnavailable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );

  const url = new URL(request.url);
  const periodMonth = month(url.searchParams.get("month"));
  const supabase = await createClient();
  const [budgets, expenses] = await Promise.all([
    supabase
      .from("business_budgets")
      .select("id,period_month,category,amount,alert_threshold_percent")
      .eq("user_id", user.id)
      .eq("period_month", periodMonth)
      .order("category"),
    supabase
      .from("business_transactions")
      .select("category,amount")
      .eq("user_id", user.id)
      .eq("direction", "expense")
      .gte("transaction_date", periodMonth)
      .lt(
        "transaction_date",
        new Date(
          Date.UTC(
            Number(periodMonth.slice(0, 4)),
            Number(periodMonth.slice(5, 7)),
            1,
          ),
        )
          .toISOString()
          .slice(0, 10),
      ),
  ]);

  const error = budgets.error || expenses.error;
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: schemaUnavailable(error)
            ? "business_budget_schema_unavailable"
            : "business_budget_unavailable",
        },
      },
      { status: 503 },
    );
  }

  const spent = new Map<string, number>();
  for (const row of expenses.data ?? []) {
    const category = String(row.category || "Uncategorized");
    spent.set(category, (spent.get(category) ?? 0) + Number(row.amount || 0));
  }
  const totalSpent = [...spent.values()].reduce((sum, value) => sum + value, 0);
  const items = (budgets.data ?? []).map((budget) => {
    const actual =
      budget.category === "all"
        ? totalSpent
        : (spent.get(budget.category) ?? 0);
    const limit = Number(budget.amount || 0);
    const percent = limit > 0 ? Math.round((actual / limit) * 100) : 0;
    return {
      ...budget,
      amount: limit,
      actual,
      remaining: limit - actual,
      percent,
      alert: percent >= Number(budget.alert_threshold_percent || 90),
      overBudget: actual > limit,
    };
  });

  return NextResponse.json({ ok: true, month: periodMonth.slice(0, 7), items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const category = String(body.category || "all")
    .trim()
    .slice(0, 120);
  if (!Number.isFinite(amount) || amount < 0 || !category) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_budget" } },
      { status: 400 },
    );
  }

  const tenant = await resolveTenantWorkspace({
    userId: user.id,
    workspaceId: body.workspaceId,
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_budgets")
    .upsert(
      {
        user_id: user.id,
        workspace_id: tenant.workspaceId,
        period_month: month(body.month),
        category,
        amount,
        alert_threshold_percent: Math.min(
          200,
          Math.max(1, Number(body.alertThresholdPercent || 90)),
        ),
      },
      { onConflict: "user_id,workspace_id,period_month,category" },
    )
    .select("id,period_month,category,amount,alert_threshold_percent")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: schemaUnavailable(error)
            ? "business_budget_schema_unavailable"
            : "business_budget_save_failed",
        },
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, budget: data });
}
