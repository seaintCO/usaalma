"use client";

import { Plus, ReceiptText, Send } from "lucide-react";
import { useEffect, useState } from "react";

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");

  async function loadInvoices() {
    const res = await fetch("/api/invoices/list");
    const data = await res.json();
    if (Array.isArray(data)) setInvoices(data);
  }

  async function createInvoice() {
    if (!clientName.trim()) return;

    await fetch("/api/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, amount: Number(amount || 0) }),
    });

    setClientName("");
    setAmount("");
    loadInvoices();
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const pending = invoices
    .filter((invoice) => invoice.status !== "pagado")
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <ReceiptText className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight">Facturación</h1>
          <p className="mt-4 text-[#6B7280]">Crea facturas, rastrea pagos y organiza ingresos.</p>
        </div>

        <div className="mt-8 grid gap-3 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:grid-cols-3">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Cliente"
            className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto"
            type="number"
            className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
          />
          <button onClick={createInvoice} className="flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nueva factura
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Ingresos registrados</div>
            <div className="mt-2 text-3xl font-medium">${total.toLocaleString()}</div>
          </div>
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Pendiente</div>
            <div className="mt-2 text-3xl font-medium">${pending.toLocaleString()}</div>
          </div>
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Facturas</div>
            <div className="mt-2 text-3xl font-medium">{invoices.length}</div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
          {invoices.length === 0 ? (
            <div className="p-6 text-sm text-[#6B7280]">No tienes facturas todavía.</div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="grid gap-4 border-b border-[#E5E7EB] p-5 last:border-b-0 md:grid-cols-5">
                <div className="font-medium">{invoice.client_name}</div>
                <div className="text-sm text-[#6B7280] md:col-span-2">${Number(invoice.amount).toLocaleString()}</div>
                <div className="text-sm text-[#6B7280]">{invoice.status}</div>
                <div className="md:text-right">
                  <button className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm">
                    <Send className="h-4 w-4" /> Enviar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
