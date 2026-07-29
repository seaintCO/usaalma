import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessTransactionDirection,
  BusinessTransactionType,
} from "@/lib/business-office/types";

const DIRECTIONS = new Set<BusinessTransactionDirection>(["income", "expense"]);
const TYPES = new Set<BusinessTransactionType>([
  "operating",
  "transfer",
  "refund",
  "owner_contribution",
  "owner_draw",
  "loan",
  "payroll",
  "tax",
]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const through = url.searchParams.get("through");
  const reviewStatus = url.searchParams.get("reviewStatus");
  const supabase = await createClient();
  let query = supabase
    .from("business_transactions")
    .select(
      "id,transaction_date,description,merchant,amount,direction,transaction_type,category,review_status,notes",
    )
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(500);
  if (from) query = query.gte("transaction_date", from.slice(0, 10));
  if (through) query = query.lte("transaction_date", through.slice(0, 10));
  if (
    reviewStatus === "needs_review" ||
    reviewStatus === "reviewed" ||
    reviewStatus === "excluded"
  ) {
    query = query.eq("review_status", reviewStatus);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "transactions_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, transactions: data ?? [] });
}

export async function POST(request: Request) {
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
  const description = String(body?.description ?? "").trim();
  const direction = String(
    body?.direction ?? "",
  ) as BusinessTransactionDirection;
  const transactionType = String(
    body?.transactionType ?? "operating",
  ) as BusinessTransactionType;
  const transactionAmount = Number(body?.amount);
  if (
    !description ||
    !DIRECTIONS.has(direction) ||
    !TYPES.has(transactionType) ||
    !Number.isFinite(transactionAmount) ||
    transactionAmount < 0
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_transaction" } },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_transactions")
    .insert({
      user_id: user.id,
      transaction_date:
        String(body?.transactionDate ?? "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      description,
      merchant: String(body?.merchant ?? "").trim() || null,
      amount: transactionAmount,
      direction,
      transaction_type: transactionType,
      category: String(body?.category ?? "").trim() || null,
      review_status: body?.reviewed ? "reviewed" : "needs_review",
      category_status: body?.category ? "confirmed" : "unreviewed",
      notes: String(body?.notes ?? "").trim() || null,
    })
    .select(
      "id,transaction_date,description,merchant,amount,direction,transaction_type,category,review_status,notes",
    )
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "transaction_create_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, transaction: data }, { status: 201 });
}
