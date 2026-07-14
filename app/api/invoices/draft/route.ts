import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { calculateInvoiceTotals, createInvoiceNumber, numberValue } from "@/lib/services/invoicing/invoiceService";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const clientName = String(body.clientName ?? "").trim();
  if (!clientName) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items.map((item: any, position: number) => ({ description: String(item.description ?? "").trim(), quantity: numberValue(item.quantity, 1), unit_price: numberValue(item.unit_price ?? item.rate), position })) : [];
  if (items.some((item: { description: string; quantity: number; unit_price: number }) => !item.description || item.quantity <= 0 || item.unit_price < 0)) return NextResponse.json({ error: "Invalid line items" }, { status: 400 });
  const sourceExecutionId = typeof body.sourceExecutionId === "string" ? body.sourceExecutionId : null;
  const supabase = await createClient();
  if (sourceExecutionId) { const { data: existing } = await supabase.from("invoices").select("*").eq("user_id", user.id).eq("source", "alma_chat").eq("source_execution_id", sourceExecutionId).maybeSingle(); if (existing) return NextResponse.json(existing); }
  const totals = calculateInvoiceTotals(items, body.taxRate, body.discountRate);
  const { data: invoice, error } = await supabase.from("invoices").insert({ user_id: user.id, invoice_number: createInvoiceNumber(), client_name: clientName, client_email: body.clientEmail || null, client_phone: body.clientPhone || null, billing_address: body.billingAddress || null, issue_date: body.issueDate || new Date().toISOString().slice(0, 10), due_date: body.dueDate || null, currency: String(body.currency || "USD").toUpperCase(), notes: body.notes || null, terms: body.terms || null, status: "draft", source: sourceExecutionId ? "alma_chat" : "manual", source_execution_id: sourceExecutionId, subtotal: totals.subtotal, tax_amount: totals.taxAmount, discount_amount: totals.discountAmount, total: totals.total, amount: totals.total }).select().single();
  if (error || !invoice) return NextResponse.json({ error: "Invoice could not be saved" }, { status: 400 });
  if (items.length) { const { error: lineError } = await supabase.from("invoice_line_items").insert(items.map((item: { description: string; quantity: number; unit_price: number; position: number }) => ({ ...item, invoice_id: invoice.id, user_id: user.id, line_total: item.quantity * item.unit_price }))); if (lineError) { await supabase.from("invoices").delete().eq("id", invoice.id).eq("user_id", user.id); return NextResponse.json({ error: "Line items could not be saved" }, { status: 500 }); } }
  return NextResponse.json(invoice, { status: 201 });
}
