import { FileText, FolderOpen, Plus, Upload } from "lucide-react";

const docs = [
  ["Contrato cliente", "PDF", "Actualizado hoy"],
  ["Propuesta SEAINT", "Documento", "Ayer"],
  ["Recibo Stripe", "PDF", "Jun 25"],
];

export default function DocumentsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10 flex items-end justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Documentos</h1>
            <p className="mt-4 text-[#6B7280]">Centraliza contratos, PDFs, archivos y conocimiento.</p>
          </div>

          <button className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Upload className="h-4 w-4" /> Subir archivo
          </button>
        </div>

        <div className="mt-12 rounded-[2rem] border border-dashed border-[#D1D5DB] bg-white p-10 text-center">
          <Upload className="mx-auto mb-4 h-8 w-8 text-[#6B7280]" />
          <h2 className="text-xl font-medium">Arrastra tus documentos aquí</h2>
          <p className="mt-2 text-sm text-[#6B7280]">ALMA podrá usarlos como contexto cuando actives memoria y búsqueda.</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {docs.map(([name, type, date]) => (
            <div key={name} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <FileText className="mb-5 h-5 w-5 text-[#6B7280]" />
              <h3 className="font-medium">{name}</h3>
              <p className="mt-2 text-sm text-[#6B7280]">{type} · {date}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
