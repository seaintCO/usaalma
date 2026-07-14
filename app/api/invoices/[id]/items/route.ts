import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { recalculateInvoiceTotals, numberValue } from "@/lib/services/invoicing/invoiceService";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invoiceId = (await context.params).id;
  const body = await request.json();
  const quantity = numberValue(body.quantity, 1);
  const unitPrice = numberValue(body.unit_price);
  if (!String(body.description ?? "").trim() || quantity <= 0 || unitPrice < 0) return NextResponse.json({ error: "Invalid line item" }, { status: 400 });
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("status").eq("id", invoiceId).eq("user_id", user.id).maybeSingle();
  if (!invoice || invoice.status !== "draft") return NextResponse.json({ error: "Draft not found" }, { status: 400 });
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 160) : null;
  if (idempotencyKey) {
    const { data: existing } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", invoiceId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json(existing);
  }
  const { data, error } = await supabase.from("invoice_line_items").insert({ invoice_id: invoiceId, user_id: user.id, description: String(body.description).trim(), quantity, unit_price: unitPrice, line_total: quantity * unitPrice, position: Math.max(0, Math.floor(numberValue(body.position))), idempotency_key: idempotencyKey }).select().single();
  if (error) return NextResponse.json({ error: "Line item could not be saved" }, { status: 400 });
  await recalculateInvoiceTotals(user.id, invoiceId);
  return NextResponse.json(data, { status: 201 });
}
