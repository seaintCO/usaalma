import { CheckCircle2, Plus } from "lucide-react";

const tasks = [
  "Responder mensajes importantes",
  "Crear una factura",
  "Planear contenido de la semana",
  "Revisar clientes pendientes",
];

export default function TasksPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight">Tasks</h1>
          <p className="mt-4 text-[#6B7280]">Organiza prioridades, recordatorios y pendientes.</p>

          <div className="mt-8 flex gap-3">
            <input className="flex-1 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" placeholder="Agregar nueva tarea..." />
            <button className="rounded-2xl bg-black px-5 text-white"><Plus className="h-5 w-5" /></button>
          </div>

          <div className="mt-8 space-y-3">
            {tasks.map((task) => (
              <div key={task} className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                <div className="h-5 w-5 rounded-full border border-[#6B7280]" />
                <span className="text-sm">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
