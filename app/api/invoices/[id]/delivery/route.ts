import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { prepareAuditedAction } from "@/lib/platform/actions/executionBoundary";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "authentication_required" } },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id,invoice_number,client_name,client_email,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !invoice) {
    return NextResponse.json(
      { ok: false, error: { code: "invoice_not_found" } },
      { status: 404 },
    );
  }
  const recipient = String(body.to || invoice.client_email || "").trim();
  const subject = String(
    body.subject || `Invoice ${invoice.invoice_number}`,
  ).trim();
  const message = String(
    body.message ||
      `Hello ${invoice.client_name},\n\nYour invoice is attached as a PDF.`,
  ).trim();
  if (!recipient || recipient.length > 320 || !subject || !message) {
    return NextResponse.json(
      { ok: false, error: { code: "invoice_delivery_invalid" } },
      { status: 400 },
    );
  }
  const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
    user.id,
  );
  if (!workspaceId) {
    return NextResponse.json(
      { ok: false, error: { code: "workspace_required" } },
      { status: 409 },
    );
  }
  const decision = await prepareAuditedAction({
    userId: user.id,
    workspaceId,
    domain: "office",
    actionKey: "office.invoice.deliver",
    actionSummary: `Email invoice ${invoice.invoice_number} to ${recipient}`,
    riskLevel: "protected",
    approvalPolicy: "always_protected",
    requestedPayload: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      recipient,
      subject,
      message,
      deliveryProvider: body.provider === "outlook" ? "outlook" : "gmail",
    },
  });
  return NextResponse.json(
    {
      ok: true,
      status: decision.status,
      approvalId: decision.approval?.id ?? null,
    },
    { status: 202 },
  );
}
