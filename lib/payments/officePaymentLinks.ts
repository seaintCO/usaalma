import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { ConnectorRepository } from "@/lib/connectors/repository";
import type { PaymentConnectorProvider } from "@/lib/connectors/types";
import { getAppBaseUrl } from "@/lib/connectors/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import {
  capturePayPalOrder,
  createPayPalOrder,
  type PayPalEnvironment,
} from "./paypal";

type InvoiceForPayment = {
  id: string;
  invoice_number: string | null;
  client_name: string;
  client_email: string | null;
  total: number;
  currency: string;
  status: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function paypalEnvironment(
  metadata: Record<string, unknown> | null | undefined,
): PayPalEnvironment {
  return metadata?.environment === "live" ? "live" : "sandbox";
}

export async function createOfficePaymentLink(input: {
  userId: string;
  workspaceId: string;
  provider: PaymentConnectorProvider;
  invoice: InvoiceForPayment;
}) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) throw new Error("payment_return_url_unavailable");
  const amount = Number(input.invoice.total);
  const currency = safeCurrency(input.invoice.currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("invoice_total_invalid");
  }
  if (["paid", "void", "cancelled"].includes(input.invoice.status)) {
    throw new Error("invoice_not_payable");
  }
  const connection = await ConnectorRepository.getConnectedProviderConnection({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: input.provider,
  });
  if (!connection) throw new Error("payment_provider_not_connected");

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("office_payment_links")
    .select(
      "id,provider,provider_checkout_url,status,amount,currency,created_at,paid_at",
    )
    .eq("user_id", input.userId)
    .eq("workspace_id", input.workspaceId)
    .eq("invoice_id", input.invoice.id)
    .eq("provider", input.provider)
    .in("status", ["active", "processing"])
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.provider_checkout_url) {
    const sameAmount = Math.abs(Number(existing.amount) - amount) <= 0.009;
    const sameCurrency = safeCurrency(existing.currency) === currency;
    if (sameAmount && sameCurrency) return existing;

    const { error: expireError } = await admin
      .from("office_payment_links")
      .update({
        status: "expired",
        last_error_code: "invoice_amount_changed",
      })
      .eq("id", existing.id)
      .in("status", ["active", "processing"]);
    if (expireError) throw expireError;
  }

  const publicToken = randomBytes(32).toString("base64url");
  const { data: link, error: insertError } = await admin
    .from("office_payment_links")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      invoice_id: input.invoice.id,
      connection_id: connection.id,
      provider: input.provider,
      public_token_hash: tokenHash(publicToken),
      amount,
      currency,
      status: "active",
      metadata: {
        invoiceNumber: input.invoice.invoice_number,
        providerAccountId: connection.provider_account_id,
      },
    })
    .select("id")
    .single();
  if (insertError || !link)
    throw insertError ?? new Error("payment_link_failed");

  try {
    let providerCheckoutId = "";
    let providerCheckoutUrl = "";
    if (input.provider === "stripe_connect") {
      if (!connection.provider_account_id) {
        throw new Error("stripe_account_missing");
      }
      const session = await getStripe().checkout.sessions.create(
        {
          mode: "payment",
          customer_email: input.invoice.client_email || undefined,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: currency.toLowerCase(),
                unit_amount: Math.round(amount * 100),
                product_data: {
                  name: `Invoice ${input.invoice.invoice_number ?? input.invoice.id.slice(0, 8)}`,
                  description: `Payment to ${input.invoice.client_name}`,
                },
              },
            },
          ],
          metadata: {
            alma_payment_link_id: link.id,
            alma_invoice_id: input.invoice.id,
            alma_workspace_id: input.workspaceId,
          },
          payment_intent_data: {
            metadata: {
              alma_payment_link_id: link.id,
              alma_invoice_id: input.invoice.id,
            },
          },
          success_url: `${baseUrl}/invoicing?payment=success`,
          cancel_url: `${baseUrl}/invoicing?payment=cancelled`,
        },
        {
          stripeAccount: connection.provider_account_id,
          idempotencyKey: `alma-office-payment-link-${link.id}`,
        },
      );
      if (!session.url) throw new Error("stripe_checkout_url_missing");
      providerCheckoutId = session.id;
      providerCheckoutUrl = session.url;
    } else {
      const secret = await ConnectorRepository.readAccessToken(connection.id);
      const environment = paypalEnvironment(connection.provider_metadata);
      const order = await createPayPalOrder({
        clientId: secret.accessToken,
        clientSecret: secret.refreshToken,
        environment,
        amount,
        currency,
        invoiceNumber:
          input.invoice.invoice_number ??
          `ALMA-${input.invoice.id.slice(0, 8)}`,
        description: `Invoice payment for ${input.invoice.client_name}`,
        returnUrl: `${baseUrl}/api/payments/paypal/return?paymentLink=${link.id}&publicToken=${encodeURIComponent(publicToken)}`,
        cancelUrl: `${baseUrl}/invoicing?payment=cancelled`,
        requestId: link.id,
      });
      providerCheckoutId = order.id;
      providerCheckoutUrl = order.url;
    }
    const { data: updated, error: updateError } = await admin
      .from("office_payment_links")
      .update({
        provider_checkout_id: providerCheckoutId,
        provider_checkout_url: providerCheckoutUrl,
      })
      .eq("id", link.id)
      .select(
        "id,provider,provider_checkout_url,status,amount,currency,created_at,paid_at",
      )
      .single();
    if (updateError) throw updateError;
    return updated;
  } catch (error) {
    await admin
      .from("office_payment_links")
      .update({
        status: "failed",
        last_error_code:
          error instanceof Error
            ? error.message.slice(0, 120)
            : "provider_error",
      })
      .eq("id", link.id);
    throw error;
  }
}

export async function settleOfficePayment(input: {
  paymentLinkId: string;
  provider: PaymentConnectorProvider;
  providerEventId: string;
  eventType: string;
  providerCheckoutId?: string;
  providerAccountId?: string;
  amount?: number;
  currency?: string;
}) {
  const admin = createAdminClient();
  const { data: link, error } = await admin
    .from("office_payment_links")
    .select("*,provider_connections(provider_account_id)")
    .eq("id", input.paymentLinkId)
    .eq("provider", input.provider)
    .maybeSingle();
  if (error || !link) throw error ?? new Error("payment_link_not_found");
  if (link.status === "paid") return link;
  if (
    input.providerCheckoutId &&
    link.provider_checkout_id !== input.providerCheckoutId
  ) {
    throw new Error("provider_checkout_mismatch");
  }
  const providerConnection = Array.isArray(link.provider_connections)
    ? link.provider_connections[0]
    : link.provider_connections;
  if (
    input.providerAccountId &&
    providerConnection?.provider_account_id !== input.providerAccountId
  ) {
    throw new Error("provider_account_mismatch");
  }
  const paidAmount = Number(input.amount ?? link.amount);
  const currency = safeCurrency(input.currency ?? link.currency);
  if (Math.abs(paidAmount - Number(link.amount)) > 0.009) {
    throw new Error("payment_amount_mismatch");
  }
  const now = new Date().toISOString();
  const { error: eventError } = await admin
    .from("office_payment_events")
    .upsert(
      {
        user_id: link.user_id,
        workspace_id: link.workspace_id,
        payment_link_id: link.id,
        provider: input.provider,
        provider_event_id: input.providerEventId,
        event_type: input.eventType,
        status: "processed",
        amount: paidAmount,
        currency,
        processed_at: now,
      },
      { onConflict: "provider,provider_event_id" },
    );
  if (eventError) throw eventError;
  const { error: linkError } = await admin
    .from("office_payment_links")
    .update({ status: "paid", paid_at: now, last_error_code: null })
    .eq("id", link.id)
    .neq("status", "paid");
  if (linkError) throw linkError;
  const { error: invoiceError } = await admin
    .from("invoices")
    .update({ status: "paid", paid_at: now })
    .eq("id", link.invoice_id)
    .eq("user_id", link.user_id);
  if (invoiceError) throw invoiceError;
  const { error: transactionError } = await admin
    .from("business_transactions")
    .insert({
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      transaction_date: now.slice(0, 10),
      description: `Invoice payment (${input.provider === "stripe_connect" ? "Stripe" : "PayPal"})`,
      amount: paidAmount,
      direction: "income",
      transaction_type: "operating",
      category: "Sales",
      category_status: "confirmed",
      review_status: "reviewed",
      payment_method: input.provider === "stripe_connect" ? "stripe" : "paypal",
      invoice_id: link.invoice_id,
      external_source: input.provider,
      external_id: input.providerEventId,
      idempotency_key: `payment:${input.provider}:${input.providerEventId}`,
    });
  if (transactionError && transactionError.code !== "23505") {
    throw transactionError;
  }
  return { ...link, status: "paid", paid_at: now };
}

export async function captureOfficePayPalPayment(input: {
  paymentLinkId: string;
  publicToken: string;
  orderId: string;
}) {
  const admin = createAdminClient();
  const { data: link, error } = await admin
    .from("office_payment_links")
    .select("*,provider_connections(provider_metadata)")
    .eq("id", input.paymentLinkId)
    .eq("provider", "paypal_business")
    .eq("public_token_hash", tokenHash(input.publicToken))
    .maybeSingle();
  if (error || !link) throw error ?? new Error("payment_link_not_found");
  if (link.provider_checkout_id !== input.orderId) {
    throw new Error("paypal_order_mismatch");
  }
  if (link.status === "paid") return link;
  const secret = await ConnectorRepository.readAccessToken(link.connection_id);
  const providerConnection = Array.isArray(link.provider_connections)
    ? link.provider_connections[0]
    : link.provider_connections;
  const capture = await capturePayPalOrder({
    clientId: secret.accessToken,
    clientSecret: secret.refreshToken,
    environment: paypalEnvironment(providerConnection?.provider_metadata),
    orderId: input.orderId,
    requestId: `${link.id}-capture`,
  });
  return settleOfficePayment({
    paymentLinkId: link.id,
    provider: "paypal_business",
    providerEventId: capture.eventId,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    providerCheckoutId: input.orderId,
    amount: capture.amount,
    currency: capture.currency,
  });
}

export function stripeCheckoutPaymentDetails(session: Stripe.Checkout.Session) {
  return {
    paymentLinkId: session.metadata?.alma_payment_link_id ?? "",
    eventType:
      session.payment_status === "paid"
        ? "checkout.session.completed"
        : "checkout.session.processing",
    amount: Number(session.amount_total ?? 0) / 100,
    currency: session.currency?.toUpperCase() ?? "USD",
    providerCheckoutId: session.id,
  };
}
