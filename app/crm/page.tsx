import { Mail, Phone, Plus, Users } from "lucide-react";

const clients = [
  ["Carlos Rivera", "Website Project", "$750", "Seguimiento"],
  ["María López", "AI Receptionist", "$100/mes", "Activo"],
  ["Acme Roofing", "CRM + Facturación", "$100/mes", "Prospecto"],
];

export default function CRMPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10 flex items-end justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium tracking-tight">CRM</h1>
            <p className="mt-4 text-[#6B7280]">Administra clientes, prospectos y oportunidades.</p>
          </div>

          <button className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
          {clients.map(([name, project, value, status]) => (
            <div key={name} className="grid gap-4 border-b border-[#E5E7EB] p-5 last:border-b-0 md:grid-cols-4">
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-sm text-[#6B7280]">{project}</div>
              </div>
              <div className="text-sm text-[#6B7280]">{value}</div>
              <div className="text-sm text-[#6B7280]">{status}</div>
              <div className="flex gap-2 md:justify-end">
                <button className="rounded-full border border-[#E5E7EB] p-2"><Mail className="h-4 w-4" /></button>
                <button className="rounded-full border border-[#E5E7EB] p-2"><Phone className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
