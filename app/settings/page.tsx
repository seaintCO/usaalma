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
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [elevenKey, setElevenKey] = useState("");

  async function loadConnections() {
    const res = await fetch("/api/oauth/list");
    const data = await res.json();
    if (Array.isArray(data)) setConnections(data);
  }

  async function connectProvider(provider:string) {
    if (provider === "google") window.location.href = "/api/oauth/google/start";
    else if (provider === "stripe") window.location.href = "/api/oauth/stripe/start";
  }

  async function connectTwilio() {
    await fetch("/api/integrations/twilio/connect", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ accountSid: twilioSid, authToken: twilioToken }),
    });
    setTwilioSid("");
    setTwilioToken("");
    loadConnections();
  }

  async function connectElevenLabs() {
    await fetch("/api/integrations/elevenlabs/connect", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ apiKey: elevenKey }),
    });
    setElevenKey("");
    loadConnections();
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
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Settings className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Configura tu ALMA.</h1>
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
            Conecta las herramientas que ALMA puede usar para trabajar por ti.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {providers.map((provider) => {
              const Icon = provider.icon;
              const connected = isConnected(provider.key);

              return (
                <div key={provider.key} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-xs text-[#6B7280]">{connected ? "Conectado" : "No conectado"}</div>
                      </div>
                    </div>

                    {provider.key === "google" || provider.key === "stripe" ? (
                      <button
                        onClick={() => connectProvider(provider.key)}
                        disabled={connected}
                        className={connected ? "rounded-full bg-green-50 px-4 py-2 text-xs font-medium text-green-700" : "rounded-full bg-black px-4 py-2 text-xs font-medium text-white"}
                      >
                        {connected ? "Conectado" : "Conectar"}
                      </button>
                    ) : null}
                  </div>

                  {provider.key === "twilio" && !connected && (
                    <div className="mt-4 grid gap-3">
                      <input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="Twilio Account SID" className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none" />
                      <input value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="Twilio Auth Token" type="password" className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none" />
                      <button onClick={connectTwilio} className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white">Guardar Twilio</button>
                    </div>
                  )}

                  {provider.key === "elevenlabs" && !connected && (
                    <div className="mt-4 grid gap-3">
                      <input value={elevenKey} onChange={(e) => setElevenKey(e.target.value)} placeholder="ElevenLabs API Key" type="password" className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none" />
                      <button onClick={connectElevenLabs} className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white">Guardar ElevenLabs</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
