"use client";

import { Bot, Calendar, CreditCard, Globe2, KeyRound, Languages, Phone, Settings, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";

const providers = [
  { key: "google", name: "Google Calendar / Gmail", icon: Calendar },
  { key: "stripe", name: "Stripe", icon: CreditCard },
  { key: "twilio", name: "Twilio", icon: Phone },
  { key: "elevenlabs", name: "ElevenLabs", icon: Bot },
];

export default function SettingsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function loadConnections() {
    const res = await fetch("/api/oauth/list");
    const data = await res.json();
    if (Array.isArray(data)) setConnections(data);
  }

  async function connectProvider(provider:string) {
    setLoading(provider);

    await fetch("/api/oauth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    await loadConnections();
    setLoading(null);
  }

  function isConnected(provider:string) {
    return connections.some((c) => c.provider === provider && c.connected);
  }

  useEffect(() => {
    loadConnections();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
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
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Perfil", "Nombre, correo y datos básicos.", User],
            ["Idioma", "Español primero, English secundario.", Languages],
            ["Memoria", "Controla lo que ALMA recuerda.", Bot],
            ["Seguridad", "Sesiones, permisos y privacidad.", Shield],
            ["API Keys", "Conecta servicios externos.", KeyRound],
            ["Conexiones", "Apps conectadas a ALMA.", Globe2],
          ].map(([title, desc, Icon]: any) => (
            <div key={title} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:p-8">
          <h2 className="text-2xl font-medium tracking-tight">Conexiones</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Conecta herramientas externas. Por ahora esto registra una conexión de prueba; luego cambiaremos cada una a OAuth real.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {providers.map((provider) => {
              const Icon = provider.icon;
              const connected = isConnected(provider.key);

              return (
                <div key={provider.key} className="flex items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-xs text-[#6B7280]">
                        {connected ? "Conectado" : "No conectado"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (provider.key === "google") {
                        window.location.href = "/api/oauth/google/start";
                      } else {
                        connectProvider(provider.key);
                      }
                    }}
                    disabled={connected || loading === provider.key}
                    className={
                      connected
                        ? "rounded-full bg-green-50 px-4 py-2 text-xs font-medium text-green-700"
                        : "rounded-full bg-black px-4 py-2 text-xs font-medium text-white"
                    }
                  >
                    {loading === provider.key ? "Conectando..." : connected ? "Conectado" : "Conectar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:p-8">
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

