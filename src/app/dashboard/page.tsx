import {
  ArrowUp,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Mail,
  Mic,
  Paperclip,
  PenSquare,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  Store,
  Users,
} from "lucide-react";

const modules = [
  ["Planner", Calendar],
  ["Tasks", CheckCircle2],
  ["Calendar", Calendar],
  ["Notes", FileText],
  ["CRM", Users],
  ["Invoicing", ReceiptText],
  ["Documents", FolderOpen],
];

const history = ["Resumen reunión Q3", "Ideas campaña marketing", "Factura cliente Acme"];

export default function DashboardPage() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-white text-[#111111]">
      <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:flex">
        <a href="/" className="flex h-16 items-center px-5 hover:bg-gray-100">
          <div>
            <div className="text-lg font-medium leading-none tracking-tight">ALMA</div>
            <div className="mt-0.5 text-[10px] text-[#6B7280]">Powered by SEAINT</div>
          </div>
        </a>

        <div className="px-3">
          <button className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-[#6B7280]" />
              Nuevo Chat
            </span>
            <PenSquare className="h-4 w-4 text-[#6B7280]" />
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              placeholder="Buscar..."
              className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 text-sm">
          <div className="mb-6">
            <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">HISTORIAL</h5>
            {history.map((item) => (
              <a key={item} className="block truncate rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                {item}
              </a>
            ))}
          </div>

          <div className="mx-2 mb-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6">
            <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">MÓDULOS</h5>
            {modules.map(([name, Icon]: any) => (
              <a key={name} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                <Icon className="h-4 w-4" />
                {name}
              </a>
            ))}
          </div>

          <div className="mx-2 mb-6 h-px bg-[#E5E7EB]" />

          <a className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <Store className="h-4 w-4" />
            Marketplace
          </a>
          <a className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <Settings className="h-4 w-4" />
            Settings
          </a>
          <a className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <CreditCard className="h-4 w-4" />
            Billing
          </a>
        </div>

        <div className="border-t border-[#E5E7EB] p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-200">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-400" />
            <div>
              <div className="text-sm font-medium">Usuario</div>
              <div className="text-xs text-[#6B7280]">Business Pro</div>
            </div>
          </button>
        </div>
      </aside>

      <section className="relative flex h-full flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] px-4 md:hidden">
          <span className="text-lg font-medium tracking-tight">ALMA</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-40">
          <div className="-translate-y-10 text-center">
            <h1 className="mb-2 text-3xl font-normal tracking-tight md:text-4xl">Buenos días.</h1>
            <h2 className="mb-4 text-3xl font-normal tracking-tight md:text-4xl">Soy ALMA.</h2>
            <p className="text-lg text-[#6B7280]">¿Cómo puedo ayudarte hoy?</p>
          </div>
        </div>

        <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent px-4 pb-6 pt-10 md:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {[
                ["Planear mi día", Calendar],
                ["Crear factura", ReceiptText],
                ["Agregar tarea", CheckCircle2],
                ["Buscar documento", FileText],
                ["Construir recepcionista IA", Mic],
                ["Enviar correo", Mail],
              ].map(([label, Icon]: any) => (
                <button key={label} className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-black">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] shadow-sm focus-within:border-[#2563EB]">
              <textarea
                rows={1}
                placeholder="Pregúntale cualquier cosa..."
                className="max-h-32 w-full resize-none bg-transparent p-4 pb-12 text-base outline-none placeholder:text-gray-400"
              />

              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                  <Paperclip className="h-5 w-5" />
                </button>
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              <button className="absolute bottom-3 right-4 rounded-lg bg-black p-1.5 text-white hover:bg-gray-800">
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400">
              ALMA puede cometer errores. Verifica la información importante.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
