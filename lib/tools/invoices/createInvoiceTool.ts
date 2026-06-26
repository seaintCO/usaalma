import { InvoiceRepository } from "@/lib/db/repositories/invoices/invoice.repository";

export async function createInvoiceTool(userId:string, clientName:string, amount:number) {
  const invoice = await InvoiceRepository.create(userId, {
    clientName,
    amount,
    status: "borrador",
  });

  return {
    success: true,
    message: `Factura creada para ${invoice.client_name} por $${Number(invoice.amount).toLocaleString()}`,
    invoice,
  };
}
