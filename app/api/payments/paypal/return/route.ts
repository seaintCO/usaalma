import { captureOfficePayPalPayment } from "@/lib/payments/officePaymentLinks";
import { getAppBaseUrl } from "@/lib/connectors/config";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentLinkId = url.searchParams.get("paymentLink") ?? "";
  const publicToken = url.searchParams.get("publicToken") ?? "";
  const orderId = url.searchParams.get("token") ?? "";
  const target = new URL("/invoicing", getAppBaseUrl() || request.url);
  if (!paymentLinkId || !publicToken || !orderId) {
    target.searchParams.set("payment", "failed");
    return NextResponse.redirect(target);
  }
  try {
    await captureOfficePayPalPayment({
      paymentLinkId,
      publicToken,
      orderId,
    });
    target.searchParams.set("payment", "success");
  } catch {
    target.searchParams.set("payment", "failed");
  }
  return NextResponse.redirect(target);
}
