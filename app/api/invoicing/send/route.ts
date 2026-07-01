import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requirePaidUser } from "@/lib/api/requirePaidUser";

export async function POST(req: Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY in Vercel." }, { status: 500 });
  }

  const data = await req.json();
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (!data.clientEmail) {
    return NextResponse.json({ error: "Client email is required." }, { status: 400 });
  }

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;padding:32px;color:#111">
    <h1>${data.invoiceTitle || "Professional Invoice"}</h1>
    <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
    <p><strong>Due:</strong> ${data.dueDate || "Due upon receipt"}</p>

    <hr/>

    <h3>From</h3>
    <p>${data.businessName || ""}<br/>${data.businessEmail || ""}<br/>${data.businessAddress || ""}</p>

    <h3>Bill To</h3>
    <p>${data.clientName || ""}<br/>${data.clientEmail || ""}<br/>${data.clientAddress || ""}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:24px">
      <thead>
        <tr>
          <th align="left">Description</th>
          <th align="right">Qty</th>
          <th align="right">Rate</th>
          <th align="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(data.items || []).map((item:any) => `
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eee">${item.description}</td>
            <td align="right">${item.quantity}</td>
            <td align="right">$${Number(item.rate || 0).toLocaleString()}</td>
            <td align="right">$${(Number(item.quantity || 0) * Number(item.rate || 0)).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <hr/>

    <p><strong>Subtotal:</strong> $${Number(data.subtotal || 0).toLocaleString()}</p>
    <p><strong>Tax:</strong> $${Number(data.tax || 0).toLocaleString()}</p>
    <p><strong>Extra Fees:</strong> $${Number(data.extraFees || 0).toLocaleString()}</p>
    <h2>Total: $${Number(data.total || 0).toLocaleString()}</h2>

    <p>${data.notes || ""}</p>
    <p style="color:#666">${data.terms || ""}</p>
  </div>
  `;

  await resend.emails.send({
    from: process.env.INVOICE_FROM_EMAIL || "ALMA <onboarding@resend.dev>",
    to: data.clientEmail,
    subject: `${data.invoiceTitle || "Invoice"} ${data.invoiceNumber || ""}`,
    html,
  });

  return NextResponse.json({ success: true });
}
