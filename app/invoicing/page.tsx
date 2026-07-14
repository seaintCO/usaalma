"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Sparkles, Trash2, Printer, Mail, Download } from "lucide-react";

type Item = {
  description: string;
  quantity: number;
  rate: number;
};

export default function InvoicingPage() {
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const [businessName, setBusinessName] = useState("SEAINT Enterprise");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [invoiceTitle, setInvoiceTitle] = useState("Professional Invoice");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-DRAFT");
  const [dueDate, setDueDate] = useState("");

  const [items, setItems] = useState<Item[]>([
    { description: "Website + AI service", quantity: 1, rate: 500 }
  ]);

  const [taxRate, setTaxRate] = useState(0);
  const [extraFees, setExtraFees] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business.");
  const [terms, setTerms] = useState("Payment is due by the due date listed above.");

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
  }, [items]);

  const tax = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + tax + Number(extraFees || 0);

  function updateItem(index:number, key:keyof Item, value:any) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }]);
  }

  function removeItem(index:number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function generateWithAI() {
    if (!aiPrompt.trim()) return;

    setLoading(true);

    const res = await fetch("/api/invoicing/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt })
    });

    const data = await res.json();

    if (data.invoice) {
      const inv = data.invoice;

      setBusinessName(inv.businessName || businessName);
      setBusinessEmail(inv.businessEmail || businessEmail);
      setBusinessAddress(inv.businessAddress || businessAddress);

      setClientName(inv.clientName || "");
      setClientEmail(inv.clientEmail || "");
      setClientAddress(inv.clientAddress || "");

      setInvoiceTitle(inv.invoiceTitle || "Professional Invoice");
      setInvoiceNumber(inv.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
      setDueDate(inv.dueDate || "");

      setItems(Array.isArray(inv.items) && inv.items.length ? inv.items : items);
      setTaxRate(Number(inv.taxRate || 0));
      setNotes(inv.notes || notes);
      setTerms(inv.terms || terms);
    } else {
      alert(data.error || "Could not generate invoice.");
    }

    setLoading(false);
  }

  async function downloadPDF() {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    const element = document.getElementById("invoice-preview");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`${invoiceNumber || "invoice"}.pdf`);
  }

  async function openEmailDraft() {
    if (!clientEmail) {
      alert("Add the client email first.");
      return;
    }

    await downloadPDF();

    const body = `
Hi ${clientName || ""},

Please see the attached invoice ${invoiceNumber}.

Invoice: ${invoiceTitle}
Due Date: ${dueDate || "Due upon receipt"}
Total: ${total.toLocaleString()}

Thank you,
${businessName}
`;

    const subject = `${invoiceTitle} ${invoiceNumber}`;
    const mailto = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

  function printInvoice() {
    window.print();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="print:hidden text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="print:hidden mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Facturación</h1>
            <p className="mt-3 text-[#6B7280]">
              Genera facturas profesionales con ALMA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={openEmailDraft} className="flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
              <Mail className="h-4 w-4" />
              Crear email
            </button>

            <button onClick={downloadPDF} className="flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium">
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>

            <button onClick={printInvoice} className="flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium">
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <section className="print:hidden mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" />
            Crear factura con ALMA
          </div>

          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ejemplo: Crea una factura para Alex Elojas por $6,009 por website, automatización y consultoría AI. Pago vence en 7 días."
            className="min-h-24 w-full rounded-2xl bg-[#F7F7F8] p-4 text-sm outline-none"
          />

          <button onClick={generateWithAI} disabled={loading} className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {loading ? "Generando..." : "Generar factura"}
          </button>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="print:hidden space-y-5 rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="font-medium">Datos de factura</h2>

            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Tu empresa" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="Email de empresa" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Dirección de empresa" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

            <div className="h-px bg-[#E5E7EB]" />

            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Cliente" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email del cliente" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Dirección del cliente" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

            <div className="h-px bg-[#E5E7EB]" />

            <input value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} placeholder="Título" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Número de factura" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Fecha de vencimiento" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} placeholder="Tax %" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <input type="number" value={extraFees} onChange={(e) => setExtraFees(Number(e.target.value))} placeholder="Extra fees / processing fee" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Términos" className="w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
          </section>

          <section id="invoice-preview" className="w-full overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm print:rounded-none print:border-0 print:shadow-none md:p-8">
            <div className="flex flex-col justify-between gap-8 border-b border-[#E5E7EB] pb-8 md:flex-row">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-[#6B7280]">Invoice</div>
                <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">{invoiceTitle}</h2>
                <p className="mt-2 text-sm text-[#6B7280]">#{invoiceNumber}</p>
              </div>

              <div className="text-left md:text-right">
                <div className="text-xl font-medium">{businessName}</div>
                {businessEmail && <div className="mt-1 text-sm text-[#6B7280]">{businessEmail}</div>}
                {businessAddress && <div className="mt-1 whitespace-pre-wrap text-sm text-[#6B7280]">{businessAddress}</div>}
              </div>
            </div>

            <div className="grid gap-8 border-b border-[#E5E7EB] py-8 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">Bill To</div>
                <div className="font-medium">{clientName || "Client Name"}</div>
                {clientEmail && <div className="mt-1 text-sm text-[#6B7280]">{clientEmail}</div>}
                {clientAddress && <div className="mt-1 whitespace-pre-wrap text-sm text-[#6B7280]">{clientAddress}</div>}
              </div>

              <div className="md:text-right">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">Due Date</div>
                <div className="font-medium">{dueDate || "Due upon receipt"}</div>
              </div>
            </div>

            <div className="py-8">
              <div className="grid grid-cols-[minmax(0,1fr)_52px_78px_78px] gap-2 border-b border-[#E5E7EB] pb-3 text-[10px] uppercase tracking-[0.14em] text-[#6B7280] md:grid-cols-[1fr_80px_120px_120px] md:text-xs md:tracking-[0.2em]">
                <div>Description</div>
                <div>Qty</div>
                <div>Rate</div>
                <div className="text-right">Amount</div>
              </div>

              <div className="divide-y divide-[#E5E7EB]">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_52px_78px_78px] items-center gap-2 py-4 md:grid-cols-[1fr_80px_120px_120px]">
                    <input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} className="min-w-0 print:border-0 rounded-xl bg-[#F7F7F8] p-2 text-sm outline-none print:bg-white print:p-0 md:p-3" />
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} className="min-w-0 print:border-0 rounded-xl bg-[#F7F7F8] p-2 text-sm outline-none print:bg-white print:p-0 md:p-3" />
                    <input type="number" value={item.rate} onChange={(e) => updateItem(index, "rate", Number(e.target.value))} className="min-w-0 print:border-0 rounded-xl bg-[#F7F7F8] p-2 text-sm outline-none print:bg-white print:p-0 md:p-3" />
                    <div className="flex items-center justify-end gap-3">
                      <span>${(Number(item.quantity || 0) * Number(item.rate || 0)).toLocaleString()}</span>
                      <button onClick={() => removeItem(index)} className="print:hidden text-[#6B7280] hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addItem} className="print:hidden mt-4 flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm">
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>

            <div className="ml-auto max-w-sm space-y-3 border-t border-[#E5E7EB] pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Tax ({taxRate}%)</span>
                <span>${tax.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Extra Fees</span>
                <span>${Number(extraFees || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between border-t border-[#E5E7EB] pt-4 text-2xl font-medium">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-10 grid gap-6 border-t border-[#E5E7EB] pt-8 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">Notes</div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#6B7280]">{notes}</p>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">Terms</div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#6B7280]">{terms}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}




