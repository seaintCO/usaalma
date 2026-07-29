import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

function amount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvResponse(filename: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function monthRange(months = 12) {
  const through = new Date();
  const from = new Date(
    Date.UTC(through.getUTCFullYear(), through.getUTCMonth() - months + 1, 1),
  );
  return {
    from: from.toISOString().slice(0, 10),
    through: through.toISOString().slice(0, 10),
  };
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
  const format = url.searchParams.get("format");
  const reportType = url.searchParams.get("type") ?? "snapshot";
  const range = monthRange();
  const supabase = await createClient();
  const [transactions, invoices, receipts, people, tax] = await Promise.all([
    supabase
      .from("business_transactions")
      .select(
        "transaction_date,description,merchant,amount,direction,transaction_type,category,review_status,notes",
      )
      .eq("user_id", user.id)
      .gte("transaction_date", range.from)
      .lte("transaction_date", range.through)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("id,status,total,due_date,created_at")
      .eq("user_id", user.id),
    supabase
      .from("business_receipts")
      .select("id,review_status")
      .eq("user_id", user.id),
    supabase
      .from("business_payroll_people")
      .select("id,display_name,worker_type,pay_type,rate,w9_status,active")
      .eq("user_id", user.id),
    supabase
      .from("business_tax_checklists")
      .select("completed_items,total_items")
      .eq("user_id", user.id)
      .eq("tax_year", new Date().getUTCFullYear())
      .eq("quarter", 0)
      .is("workspace_id", null)
      .maybeSingle(),
  ]);
  const error =
    transactions.error ||
    invoices.error ||
    receipts.error ||
    people.error ||
    tax.error;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "reports_unavailable" } },
      { status: 503 },
    );
  }
  const transactionRows = transactions.data ?? [];
  const operatingIncome = transactionRows
    .filter(
      (row) =>
        row.direction === "income" &&
        !["transfer", "owner_contribution", "loan"].includes(
          row.transaction_type,
        ),
    )
    .reduce((sum, row) => sum + amount(row.amount), 0);
  const operatingExpenses = transactionRows
    .filter(
      (row) =>
        row.direction === "expense" &&
        !["transfer", "owner_draw"].includes(row.transaction_type),
    )
    .reduce((sum, row) => sum + amount(row.amount), 0);

  if (format === "csv" && reportType === "transactions") {
    return csvResponse(`alma-transactions-${range.through}.csv`, [
      [
        "Date",
        "Description",
        "Merchant",
        "Direction",
        "Type",
        "Category",
        "Amount",
        "Review status",
        "Notes",
      ],
      ...transactionRows.map((row) => [
        row.transaction_date,
        row.description,
        row.merchant,
        row.direction,
        row.transaction_type,
        row.category,
        row.amount,
        row.review_status,
        row.notes,
      ]),
    ]);
  }
  if (format === "csv" && reportType === "profit-loss") {
    return csvResponse(`alma-profit-loss-${range.through}.csv`, [
      ["ALMA bookkeeping preparation", range.from, range.through],
      ["Operating income", operatingIncome],
      ["Operating expenses", operatingExpenses],
      ["Estimated operating profit", operatingIncome - operatingExpenses],
      [],
      [
        "Review with a qualified accountant before filing or making tax decisions.",
      ],
    ]);
  }
  if (format === "csv" && reportType === "contractors") {
    return csvResponse(`alma-contractors-${range.through}.csv`, [
      ["Name", "Worker type", "Pay type", "Rate", "W-9 status", "Active"],
      ...(people.data ?? []).map((row) => [
        row.display_name,
        row.worker_type,
        row.pay_type,
        row.rate,
        row.w9_status,
        row.active,
      ]),
    ]);
  }

  const categoryTotals = (
    direction: "income" | "expense",
  ): Array<{ category: string; amount: number }> => {
    const totals = new Map<string, number>();
    for (const row of transactionRows) {
      if (row.direction !== direction || row.transaction_type === "transfer")
        continue;
      const category = row.category || "Uncategorized";
      totals.set(category, (totals.get(category) ?? 0) + amount(row.amount));
    }
    return [...totals.entries()]
      .map(([category, total]) => ({ category, amount: total }))
      .sort((a, b) => b.amount - a.amount);
  };
  const cashMonths = new Map<
    string,
    { month: string; income: number; expenses: number; net: number }
  >();
  for (const row of transactionRows) {
    const month = String(row.transaction_date).slice(0, 7);
    const current = cashMonths.get(month) ?? {
      month,
      income: 0,
      expenses: 0,
      net: 0,
    };
    if (
      row.direction === "income" &&
      !["transfer", "owner_contribution", "loan"].includes(row.transaction_type)
    )
      current.income += amount(row.amount);
    if (
      row.direction === "expense" &&
      !["transfer", "owner_draw"].includes(row.transaction_type)
    )
      current.expenses += amount(row.amount);
    current.net = current.income - current.expenses;
    cashMonths.set(month, current);
  }
  const today = new Date(`${range.through}T00:00:00.000Z`).getTime();
  const aging = {
    current: 0,
    days1To30: 0,
    days31To60: 0,
    days61Plus: 0,
  };
  for (const invoice of invoices.data ?? []) {
    if (
      !["sent", "viewed", "overdue", "partially_paid"].includes(invoice.status)
    )
      continue;
    const days = invoice.due_date
      ? Math.floor(
          (today - new Date(`${invoice.due_date}T00:00:00.000Z`).getTime()) /
            86_400_000,
        )
      : 0;
    if (days <= 0) aging.current += amount(invoice.total);
    else if (days <= 30) aging.days1To30 += amount(invoice.total);
    else if (days <= 60) aging.days31To60 += amount(invoice.total);
    else aging.days61Plus += amount(invoice.total);
  }
  const completed = amount(tax.data?.completed_items);
  const total = Math.max(1, amount(tax.data?.total_items) || 8);
  return NextResponse.json({
    ok: true,
    report: {
      period: range,
      profitLoss: {
        operatingIncome,
        operatingExpenses,
        estimatedOperatingProfit: operatingIncome - operatingExpenses,
        incomeByCategory: categoryTotals("income"),
        expensesByCategory: categoryTotals("expense"),
      },
      cashFlow: [...cashMonths.values()].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      invoiceAging: aging,
      readiness: {
        transactionsToReview: transactionRows.filter(
          (row) => row.review_status === "needs_review",
        ).length,
        missingReceipts: (receipts.data ?? []).filter(
          (row) => row.review_status === "needs_review",
        ).length,
        taxScore: Math.round((completed / total) * 100),
        contractorsMissingW9: (people.data ?? []).filter(
          (row) =>
            row.worker_type === "contractor" &&
            row.active &&
            row.w9_status !== "received",
        ).length,
      },
    },
  });
}
