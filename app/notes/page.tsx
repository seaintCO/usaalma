import { FileText, Plus } from "lucide-react";

const notes = [
  ["Idea de negocio", "Crear módulos simples para negocios pequeños."],
  ["Recordatorio", "Mantener ALMA español primero, English después."],
  ["Cliente", "Preparar flujo para CRM y facturación."],
];

export default function NotesPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10 flex items-end justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Notes</h1>
            <p className="mt-4 text-[#6B7280]">Guarda ideas, reuniones y contexto importante.</p>
          </div>

          <button className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nueva nota
          </button>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {notes.map(([title, body]) => (
            <div key={title} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <h2 className="font-medium">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
