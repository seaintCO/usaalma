import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { getStripe } from "@/lib/stripe/server";
import type { BillingInvoice } from "@/lib/billing/types";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const subscription = await SubscriptionRepository.get(user.id);
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ ok: true, invoices: [] });
    }
    const invoices = await getStripe().invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    });
    const result: BillingInvoice[] = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      createdAt: invoice.created
        ? new Date(invoice.created * 1000).toISOString()
        : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
    }));
    return NextResponse.json({ ok: true, invoices: result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "history_unavailable" },
      { status: 503 },
    );
  }
}
