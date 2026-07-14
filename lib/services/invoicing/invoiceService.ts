import { createClient } from "@/lib/supabase/server";

export const invoiceStatuses = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateInvoiceTotals(items: Array<{ quantity: unknown; unit_price: unknown }>, taxRate = 0, discountRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, numberValue(item.quantity)) * Math.max(0, numberValue(item.unit_price)), 0);
  const taxAmount = Math.max(0, subtotal * Math.max(0, numberValue(taxRate)) / 100);
  const discountAmount = Math.max(0, subtotal * Math.max(0, numberValue(discountRate)) / 100);
  return { subtotal, taxAmount, discountAmount, total: Math.max(0, subtotal + taxAmount - discountAmount) };
}

export async function getOwnedInvoice(userId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function recalculateInvoiceTotals(userId: string, invoiceId: string) {
  const supabase = await createClient();
  const [{ data: lines, error: linesError }, { data: invoice, error: invoiceError }] = await Promise.all([
    supabase.from("invoice_line_items").select("quantity,unit_price").eq("invoice_id", invoiceId).eq("user_id", userId),
    supabase.from("invoices").select("tax_amount,discount_amount").eq("id", invoiceId).eq("user_id", userId).maybeSingle(),
  ]);
  if (linesError) throw linesError;
  if (invoiceError || !invoice) throw invoiceError ?? new Error("Invoice not found");
  const subtotal = (lines ?? []).reduce((sum, line) => sum + numberValue(line.quantity) * numberValue(line.unit_price), 0);
  const total = Math.max(0, subtotal + numberValue(invoice.tax_amount) - numberValue(invoice.discount_amount));
  const { data, error } = await supabase.from("invoices").update({ subtotal, total, amount: total }).eq("id", invoiceId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}

export function createInvoiceNumber() {
  return `INV-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
