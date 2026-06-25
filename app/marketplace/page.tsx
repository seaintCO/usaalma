import {
  Bot,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Mail,
  MessageSquareText,
  ReceiptText,
  Store,
  Users,
  Zap,
} from "lucide-react";

const modules = [
  {
    name: "CRM",
    desc: "Clientes, prospectos, seguimiento y oportunidades.",
    price: "Incluido en Business Pro",
    icon: Users,
  },
  {
    name: "Facturación",
    desc: "Crea facturas profesionales y rastrea pagos.",
    price: "Incluido en Business Pro",
    icon: ReceiptText,
  },
  {
    name: "Planner",
    desc: "Planifica tu día, semana y metas.",
    price: "Incluido en Personal",
    icon: Calendar,
  },
  {
    name: "Tasks",
    desc: "Organiza prioridades, recordatorios y pendientes.",
    price: "Incluido en Personal",
    icon: CheckCircle2,
  },
  {
    name: "Documentos",
    desc: "Guarda contratos, PDFs y archivos importantes.",
    price: "Incluido en Personal",
    icon: FileText,
  },
  {
    name: "Recepcionista IA",
    desc: "Construye una recepcionista conectada a llamadas y mensajes.",
    price: "+ $99/mes",
    icon: Bot,
    premium: true,
  },
  {
    name: "Automatizaciones",
    desc: "Conecta tareas, correos, clientes y recordatorios.",
    price: "+ $49/mes",
    icon: Zap,
    premium: true,
  },
  {
    name: "Email Marketing",
    desc: "Campañas, seguimientos y mensajes para clientes.",
    price: "+ $29/mes",
    icon: Mail,
    premium: true,
  },
  {
    name: "SMS",
    desc: "Mensajes automáticos para leads, citas y pagos.",
    price: "+ uso Twilio",
    icon: MessageSquareText,
    premium: true,
  },
  {
    name: "Website Builder",
    desc: "Landing pages simples para vender y captar leads.",
    price: "+ $49/mes",
    icon: Globe,
    premium: true,
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Store className="h-5 w-5" />
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
              Marketplace
            </p>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Instala solo lo que necesitas.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
              ALMA funciona como un sistema operativo. Activa módulos personales,
              herramientas de negocio y automatizaciones cuando las necesites.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
            <div className="font-medium text-black">Planes principales</div>
            <div>Personal: $25/mes</div>
            <div>Business Pro: $100/mes</div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div
              key={module.name}
              className="flex flex-col rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-black/5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                  <module.icon className="h-5 w-5" />
                </div>

                <span
                  className={
                    module.premium
                      ? "rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white"
                      : "rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#6B7280]"
                  }
                >
                  {module.price}
                </span>
              </div>

              <h2 className="text-lg font-medium tracking-tight">{module.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#6B7280]">{module.desc}</p>

              <button className="mt-6 rounded-2xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800">
                Instalar módulo
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
