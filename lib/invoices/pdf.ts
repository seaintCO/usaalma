import { jsPDF } from "jspdf";

export type InvoicePdfRecord = {
  invoice_number?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  billing_address?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  discount_amount?: number | string | null;
  total?: number | string | null;
  notes?: string | null;
  terms?: string | null;
  invoice_line_items?: Array<{
    description?: string | null;
    quantity?: number | string | null;
    unit_price?: number | string | null;
    line_total?: number | string | null;
  }>;
};

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

export function createInvoicePdf(invoice: InvoicePdfRecord) {
  const pdf = new jsPDF();
  const number = invoice.invoice_number || "Invoice";
  const currency = invoice.currency || "USD";
  pdf.setFontSize(20);
  pdf.text(`Invoice ${number}`, 20, 22);
  pdf.setFontSize(11);
  pdf.text(`Customer: ${invoice.client_name || "Customer"}`, 20, 34);
  if (invoice.client_email) pdf.text(invoice.client_email, 20, 41);
  if (invoice.issue_date) pdf.text(`Issued: ${invoice.issue_date}`, 130, 34);
  if (invoice.due_date) pdf.text(`Due: ${invoice.due_date}`, 130, 41);
  pdf.line(20, 49, 190, 49);
  let y = 60;
  for (const line of invoice.invoice_line_items ?? []) {
    const description = String(line.description || "Item").slice(0, 75);
    pdf.text(description, 20, y);
    pdf.text(
      `${amount(line.quantity)} × ${amount(line.unit_price)} ${currency}`,
      112,
      y,
    );
    pdf.text(`${amount(line.line_total)} ${currency}`, 164, y, {
      align: "right",
    });
    y += 8;
    if (y > 250) {
      pdf.addPage();
      y = 25;
    }
  }
  y += 6;
  pdf.line(112, y, 190, y);
  y += 8;
  pdf.text(`Subtotal: ${amount(invoice.subtotal)} ${currency}`, 190, y, {
    align: "right",
  });
  y += 7;
  if (Number(invoice.tax_amount)) {
    pdf.text(`Tax: ${amount(invoice.tax_amount)} ${currency}`, 190, y, {
      align: "right",
    });
    y += 7;
  }
  if (Number(invoice.discount_amount)) {
    pdf.text(
      `Discount: -${amount(invoice.discount_amount)} ${currency}`,
      190,
      y,
      { align: "right" },
    );
    y += 7;
  }
  pdf.setFontSize(14);
  pdf.text(`Total: ${amount(invoice.total)} ${currency}`, 190, y, {
    align: "right",
  });
  if (invoice.notes) {
    y += 18;
    pdf.setFontSize(10);
    pdf.text("Notes", 20, y);
    y += 6;
    pdf.text(pdf.splitTextToSize(invoice.notes, 165), 20, y);
  }
  return {
    fileName: `${String(number).replace(/[^a-z0-9_-]+/gi, "-") || "invoice"}.pdf`,
    bytes: Buffer.from(pdf.output("arraybuffer")),
  };
}
