import { Plus, ReceiptText, Send } from "lucide-react";

const invoices = [
  ["INV-001", "Carlos Rivera", "$750", "Pendiente"],
  ["INV-002", "María López", "$100", "Pagado"],
  ["INV-003", "Acme Roofing", "$2,500", "Borrador"],
];

export default function InvoicingPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10 flex items-end justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <ReceiptText className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Facturación</h1>
            <p className="mt-4 text-[#6B7280]">Crea facturas, rastrea pagos y organiza ingresos.</p>
          </div>

          <button className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nueva factura
          </button>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Ingresos este mes</div>
            <div className="mt-2 text-3xl font-medium">$3,350</div>
          </div>
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Pendiente</div>
            <div className="mt-2 text-3xl font-medium">$750</div>
          </div>
          <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
            <div className="text-sm text-[#6B7280]">Facturas</div>
            <div className="mt-2 text-3xl font-medium">3</div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
          {invoices.map(([id, client, amount, status]) => (
            <div key={id} className="grid gap-4 border-b border-[#E5E7EB] p-5 last:border-b-0 md:grid-cols-5">
              <div className="font-medium">{id}</div>
              <div className="text-sm text-[#6B7280] md:col-span-2">{client}</div>
              <div className="text-sm text-[#6B7280]">{amount} · {status}</div>
              <div className="md:text-right">
                <button className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm">
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
