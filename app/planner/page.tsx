import { Calendar, Clock, Target } from "lucide-react";

const blocks = [
  ["Hoy", "Plan rápido para organizar tu día."],
  ["Esta semana", "Prioridades, reuniones y metas."],
  ["Metas", "Objetivos personales y de negocio."],
];

export default function PlannerPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Calendar className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Planner</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Planifica tu día, semana y metas con ALMA.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {blocks.map(([title, desc]) => (
            <div key={title} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <Target className="mb-5 h-5 w-5 text-[#6B7280]" />
              <h2 className="text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm text-[#6B7280]">{desc}</p>
              <textarea className="mt-6 min-h-32 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none" placeholder="Escribe aquí..." />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
