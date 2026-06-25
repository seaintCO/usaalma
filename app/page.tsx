import {
  Calendar,
  CheckCircle2,
  FileText,
  Mic,
  ReceiptText,
  Store,
  Users,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const features = [
  ["Chat Inteligente", MessageCircle],
  ["Planner", Calendar],
  ["Tasks", CheckCircle2],
  ["CRM", Users],
  ["Facturación", ReceiptText],
  ["Documentos", FileText],
  ["Marketplace", Store],
  ["Automatizaciones", Sparkles],
  ["Recepcionista IA", Mic],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <header className="fixed top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <div className="text-xl font-medium tracking-tight">ALMA</div>
            <div className="text-[10px] text-[#6B7280]">Powered by SEAINT</div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#6B7280] md:flex">
            <a href="#features" className="hover:text-black">Características</a>
            <a href="#marketplace" className="hover:text-black">Marketplace</a>
            <a href="#pricing" className="hover:text-black">Precios</a>
            <a href="#" className="hover:text-black">English</a>
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <a href="/login" className="hidden text-[#6B7280] hover:text-black md:block">
              Iniciar sesión
            </a>
            <a href="/dashboard" className="rounded-full bg-black px-5 py-2 font-medium text-white">
              Crear cuenta
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-24 pt-32 md:pt-48 lg:flex-row">
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl font-medium tracking-tight md:text-6xl lg:text-7xl">
            Tu sistema operativo personal y empresarial.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6B7280] md:text-xl lg:mx-0">
            ALMA organiza tu vida, administra tu negocio y conecta todas tus herramientas desde un solo lugar.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <a href="/dashboard" className="w-full rounded-full bg-[#2563EB] px-8 py-3.5 text-center font-medium text-white sm:w-auto">
              Crear mi ALMA
            </a>
            <a href="#pricing" className="w-full rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-8 py-3.5 text-center font-medium sm:w-auto">
              Ver planes
            </a>
          </div>
        </div>

        <div className="relative w-full max-w-2xl flex-1">
          <div className="absolute inset-0 rotate-2 scale-105 rounded-3xl border border-[#E5E7EB] bg-gradient-to-tr from-[#F7F7F8] to-white" />
          <div className="relative flex h-[500px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl shadow-black/5">
            <aside className="hidden w-52 border-r border-[#E5E7EB] bg-[#F7F7F8] p-4 sm:block">
              <div className="mb-6">
                <div className="font-medium tracking-tight">ALMA</div>
                <div className="text-[10px] text-[#6B7280]">Powered by SEAINT</div>
              </div>
              {["Nuevo Chat", "Planner", "Tasks", "CRM", "Facturación", "Marketplace"].map((item) => (
                <div key={item} className="mb-2 rounded-xl px-3 py-2 text-sm text-[#6B7280]">
                  {item}
                </div>
              ))}
            </aside>

            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <div className="mb-4 w-3/4 rounded-2xl rounded-tl-none border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                  <p className="text-sm font-medium">Buenos días.</p>
                  <p className="mt-2 text-sm text-[#6B7280]">Soy ALMA. ¿Qué quieres lograr hoy?</p>
                </div>
                <div className="ml-auto w-2/3 rounded-2xl rounded-tr-none bg-blue-50 p-4 text-sm text-[#2563EB]">
                  Planéame el día y crea una factura.
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm text-[#6B7280]">
                Pregúntale cualquier cosa...
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#E5E7EB] bg-[#F7F7F8] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-16 text-center text-3xl font-medium tracking-tight md:text-4xl">
            Todo en un solo lugar.
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {features.map(([name, Icon]: any) => (
              <div key={name} className="rounded-2xl border border-[#E5E7EB] bg-white p-6 transition hover:-translate-y-1 hover:shadow-md">
                <Icon className="mb-4 h-7 w-7" />
                <div className="text-sm font-medium">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="marketplace" className="border-y border-[#E5E7EB] bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-2 text-3xl font-medium tracking-tight">Marketplace</h2>
          <p className="mb-12 text-[#6B7280]">Instala módulos para expandir tu sistema operativo.</p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["CRM", "Gestiona clientes y seguimiento.", "Incluido en Pro"],
              ["Facturación", "Crea y envía facturas profesionales.", "Incluido en Pro"],
              ["Recepcionista IA", "Responde clientes 24/7.", "$15/mes"],
            ].map(([name, desc, price]) => (
              <div key={name} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-6">
                <h4 className="mb-1 font-medium">{name}</h4>
                <p className="mb-4 text-sm text-[#6B7280]">{desc}</p>
                <div className="text-xs font-medium text-[#6B7280]">{price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-32">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-16 text-center text-3xl font-medium tracking-tight md:text-4xl">
            Precios simples.
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <Plan title="ALMA Personal" price="$25" desc="Perfecto para individuos." items={["Chat Inteligente", "Memoria", "Planner & Tasks", "Calendar & Notes", "Documentos"]} />
            <Plan title="ALMA Business Pro" price="$100" desc="Para emprendedores y negocios." items={["Todo en Personal", "CRM", "Facturación", "Portal de Clientes", "Automatizaciones"]} featured />
          </div>
        </div>
      </section>
    </main>
  );
}

function Plan({ title, price, desc, items, featured }: any) {
  return (
    <div className={featured ? "relative flex flex-col rounded-[2rem] border border-blue-200 bg-blue-50/30 p-10" : "flex flex-col rounded-[2rem] border border-[#E5E7EB] p-10"}>
      {featured && <div className="absolute right-10 top-0 -translate-y-1/2 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white">Recomendado</div>}
      <h3 className="mb-2 text-xl font-medium">{title}</h3>
      <p className="mb-6 text-sm text-[#6B7280]">{desc}</p>
      <div className="mb-8">
        <span className="text-5xl font-medium">{price}</span>
        <span className="text-[#6B7280]">/mes</span>
      </div>
      <ul className="mb-10 flex-1 space-y-4 text-sm">
        {items.map((item: string) => (
          <li key={item} className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-[#6B7280]" />
            {item}
          </li>
        ))}
      </ul>
      <a href="/dashboard" className={featured ? "rounded-2xl bg-[#2563EB] py-4 text-center font-medium text-white" : "rounded-2xl bg-[#F7F7F8] py-4 text-center font-medium"}>
        Comenzar
      </a>
    </div>
  );
}
