import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessAppointment,
  BusinessOfficeOverview,
  BusinessTransaction,
} from "@/lib/business-office/types";

function monthBounds() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    from: from.toISOString().slice(0, 10),
    through: now.toISOString().slice(0, 10),
  };
}

function amount(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const period = monthBounds();
  const todayStart = new Date(`${period.through}T00:00:00.000Z`).toISOString();
  const todayEnd = new Date(`${period.through}T23:59:59.999Z`).toISOString();

  const [
    transactions,
    appointments,
    invoices,
    leads,
    tasks,
    receipts,
    taxChecklist,
    quickBooks,
  ] = await Promise.all([
    supabase
      .from("business_transactions")
      .select(
        "id,transaction_date,description,merchant,amount,direction,transaction_type,category,review_status,notes",
      )
      .eq("user_id", user.id)
      .gte("transaction_date", period.from)
      .lte("transaction_date", period.through)
      .order("transaction_date", { ascending: false })
      .limit(100),
    supabase
      .from("business_appointments")
      .select("id,title,starts_at,ends_at,status,location,notes")
      .eq("user_id", user.id)
      .gte("ends_at", todayStart)
      .order("starts_at", { ascending: true })
      .limit(25),
    supabase
      .from("invoices")
      .select("id,status,total,due_date,paid_at")
      .eq("user_id", user.id),
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("stage", ["lead", "contacted", "qualified"]),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", false),
    supabase
      .from("business_receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("review_status", "needs_review"),
    supabase
      .from("business_tax_checklists")
      .select("completed_items,total_items")
      .eq("user_id", user.id)
      .eq("tax_year", new Date().getUTCFullYear())
      .eq("quarter", 0)
      .maybeSingle(),
    supabase
      .from("quickbooks_connections")
      .select("status,company_name,last_successful_sync_at")
      .eq("user_id", user.id)
      .is("disconnected_at", null)
      .maybeSingle(),
  ]);

  const schemaError =
    transactions.error ||
    appointments.error ||
    receipts.error ||
    taxChecklist.error ||
    quickBooks.error;
  if (schemaError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "business_office_schema_unavailable",
          message:
            "Apply the ALMA Business Office migration before using financial operations.",
        },
      },
      { status: 503 },
    );
  }
  if (invoices.error || leads.error || tasks.error) {
    return NextResponse.json(
      { ok: false, error: { code: "business_office_summary_unavailable" } },
      { status: 503 },
    );
  }

  const transactionRows = (transactions.data ?? []) as BusinessTransaction[];
  const invoiceRows = invoices.data ?? [];
  const postedIncome = transactionRows
    .filter(
      (row) =>
        row.direction === "income" &&
        !["transfer", "owner_contribution", "loan"].includes(
          row.transaction_type,
        ),
    )
    .reduce((sum, row) => sum + amount(row.amount), 0);
  const expenses = transactionRows
    .filter(
      (row) =>
        row.direction === "expense" &&
        !["transfer", "owner_draw"].includes(row.transaction_type),
    )
    .reduce((sum, row) => sum + amount(row.amount), 0);
  const collected = invoiceRows
    .filter(
      (row) =>
        row.status === "paid" &&
        row.paid_at &&
        String(row.paid_at).slice(0, 10) >= period.from,
    )
    .reduce((sum, row) => sum + amount(row.total), 0);
  const invoiced = invoiceRows
    .filter(
      (row) =>
        !["cancelled", "void"].includes(row.status) &&
        String(row.paid_at ?? row.due_date ?? period.through).slice(0, 10) >=
          period.from,
    )
    .reduce((sum, row) => sum + amount(row.total), 0);
  const outstandingInvoices = invoiceRows
    .filter((row) => ["sent", "viewed", "overdue"].includes(row.status))
    .reduce((sum, row) => sum + amount(row.total), 0);
  const overdueInvoices = invoiceRows.filter(
    (row) =>
      row.status === "overdue" ||
      (["sent", "viewed"].includes(row.status) &&
        row.due_date &&
        row.due_date < period.through),
  ).length;
  const todayAppointments = (
    (appointments.data ?? []) as BusinessAppointment[]
  ).filter(
    (row) => row.starts_at >= todayStart && row.starts_at <= todayEnd,
  ).length;
  const completed = amount(taxChecklist.data?.completed_items);
  const total = Math.max(1, amount(taxChecklist.data?.total_items) || 8);

  const overview: BusinessOfficeOverview = {
    period,
    money: {
      collected,
      postedIncome,
      expenses,
      estimatedOperatingProfit: postedIncome - expenses,
      invoiced,
      outstandingInvoices,
    },
    attention: {
      newLeads: leads.count ?? 0,
      openTasks: tasks.count ?? 0,
      appointmentsToday: todayAppointments,
      overdueInvoices,
      transactionsToReview: transactionRows.filter(
        (row) => row.review_status === "needs_review",
      ).length,
      missingReceipts: receipts.count ?? 0,
    },
    taxReadiness: {
      completed,
      total,
      score: Math.round((completed / total) * 100),
    },
    quickBooks: {
      status:
        quickBooks.data?.status === "connected" ||
        quickBooks.data?.status === "reauthorization_required" ||
        quickBooks.data?.status === "error"
          ? quickBooks.data.status
          : "disconnected",
      companyName: quickBooks.data?.company_name ?? null,
      lastSuccessfulSyncAt: quickBooks.data?.last_successful_sync_at ?? null,
    },
    transactions: transactionRows,
    appointments: (appointments.data ?? []) as BusinessAppointment[],
  };

  return NextResponse.json({ ok: true, overview });
}
