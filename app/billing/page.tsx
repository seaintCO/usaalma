import { CheckCircle2, CreditCard } from "lucide-react";

const plans = [
  {
    name: "ALMA Personal",
    price: "$25",
    desc: "Para individuos que quieren organizar su vida con ALMA.",
    items: ["Chat", "Memoria", "Planner", "Tasks", "Notes", "Documentos", "Marketplace"],
  },
  {
    name: "ALMA Business Pro",
    price: "$100",
    desc: "Para emprendedores y negocios que quieren operar desde un solo lugar.",
    items: ["Todo en Personal", "CRM", "Facturación", "Client Portal", "Automatizaciones", "Workspace empresarial"],
    featured: true,
  },
];

const addOns = [
  ["Recepcionista IA", "$99/mes"],
  ["Automatizaciones Avanzadas", "$49/mes"],
  ["Website Builder", "$49/mes"],
  ["Email Marketing", "$29/mes"],
  ["SMS", "Uso Twilio"],
];

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            Billing
          </p>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Planes simples para crecer.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Mantén ALMA accesible para individuos y poderosa para negocios.
            Los módulos avanzados se activan solo cuando los necesites.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.featured
                  ? "relative rounded-[2rem] border border-blue-200 bg-blue-50/40 p-8 shadow-lg shadow-blue-900/5"
                  : "rounded-[2rem] border border-[#E5E7EB] bg-white p-8"
              }
            >
              {plan.featured && (
                <div className="absolute right-8 top-0 -translate-y-1/2 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white">
                  Recomendado
                </div>
              )}

              <h2 className="text-2xl font-medium tracking-tight">{plan.name}</h2>
              <p className="mt-2 text-sm text-[#6B7280]">{plan.desc}</p>

              <div className="mt-8">
                <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
                <span className="text-[#6B7280]">/mes</span>
              </div>

              <ul className="mt-8 space-y-4 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#6B7280]" />
                    {item}
                  </li>
                ))}
              </ul>

              <button className={plan.featured ? "mt-8 w-full rounded-2xl bg-[#2563EB] py-4 font-medium text-white" : "mt-8 w-full rounded-2xl bg-black py-4 font-medium text-white"}>
                Elegir plan
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-8">
          <h2 className="text-2xl font-medium tracking-tight">Módulos adicionales</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Estos módulos pueden activarse encima de tu plan principal.
          </p>

          <div className="mt-6 divide-y divide-[#E5E7EB]">
            {addOns.map(([name, price]) => (
              <div key={name} className="flex items-center justify-between py-4 text-sm">
                <span>{name}</span>
                <span className="font-medium text-[#6B7280]">{price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
