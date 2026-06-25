import { Bot, Globe2, KeyRound, Languages, Settings, Shield, User } from "lucide-react";

const settings = [
  {
    title: "Perfil",
    desc: "Nombre, correo, foto y datos básicos de tu cuenta.",
    icon: User,
  },
  {
    title: "Idioma",
    desc: "ALMA empieza en español. Puedes activar English cuando quieras.",
    icon: Languages,
  },
  {
    title: "Memoria",
    desc: "Controla lo que ALMA recuerda sobre ti, tus metas y tu negocio.",
    icon: Bot,
  },
  {
    title: "Conexiones",
    desc: "Google Calendar, Gmail, Stripe, Twilio, ElevenLabs y más.",
    icon: Globe2,
  },
  {
    title: "Seguridad",
    desc: "Contraseña, sesiones, permisos y privacidad.",
    icon: Shield,
  },
  {
    title: "API Keys",
    desc: "Conecta servicios externos sin compartir contraseñas.",
    icon: KeyRound,
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Settings className="h-5 w-5" />
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            Settings
          </p>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Configura tu ALMA.
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Controla idioma, memoria, conexiones, privacidad y preferencias.
            ALMA es tuya, no genérica.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {settings.map((item) => (
            <div key={item.title} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-black/5">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                <item.icon className="h-5 w-5" />
              </div>

              <h2 className="text-lg font-medium tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{item.desc}</p>

              <button className="mt-6 rounded-2xl bg-[#F7F7F8] px-4 py-2 text-sm font-medium hover:bg-gray-200">
                Configurar
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-8">
          <h2 className="text-2xl font-medium tracking-tight">Preferencia de idioma</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            El idioma principal de ALMA será español. English estará disponible como traducción secundaria.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button className="rounded-2xl border border-[#2563EB] bg-blue-50 p-5 text-left">
              <div className="font-medium">Español</div>
              <div className="mt-1 text-sm text-[#6B7280]">Idioma principal</div>
            </button>

            <button className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-5 text-left">
              <div className="font-medium">English</div>
              <div className="mt-1 text-sm text-[#6B7280]">Disponible como traducción</div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
