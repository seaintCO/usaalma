import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import type { PaymentConnectorProvider } from "@/lib/connectors/types";
import { createOfficePaymentLink } from "@/lib/payments/officePaymentLinks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PAYMENT_PROVIDERS = new Set<PaymentConnectorProvider>([
  "stripe_connect",
  "paypal_business",
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const invoiceId = (await context.params).id;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("office_payment_links")
    .select(
      "id,provider,provider_checkout_url,status,amount,currency,created_at,paid_at",
    )
    .eq("user_id", user.id)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) {
    return Response.json(
      { ok: false, error: { code: "payment_links_unavailable" } },
      { status: 503 },
    );
  }
  return Response.json({ ok: true, links: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    provider?: PaymentConnectorProvider;
  };
  if (!body.provider || !PAYMENT_PROVIDERS.has(body.provider)) {
    return Response.json(
      { ok: false, error: { code: "payment_provider_invalid" } },
      { status: 400 },
    );
  }
  const invoiceId = (await context.params).id;
  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id,invoice_number,client_name,client_email,total,currency,status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !invoice) {
    return Response.json(
      { ok: false, error: { code: "invoice_not_found" } },
      { status: 404 },
    );
  }
  try {
    const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
      user.id,
    );
    if (!workspaceId) throw new Error("workspace_required");
    const link = await createOfficePaymentLink({
      userId: user.id,
      workspaceId,
      provider: body.provider,
      invoice: {
        ...invoice,
        total: Number(invoice.total),
      },
    });
    return Response.json({ ok: true, link }, { status: 201 });
  } catch (caught) {
    const code =
      caught instanceof Error ? caught.message : "payment_link_create_failed";
    const status =
      code === "payment_provider_not_connected"
        ? 409
        : code.includes("invoice_")
          ? 400
          : 503;
    return Response.json({ ok: false, error: { code } }, { status });
  }
}
