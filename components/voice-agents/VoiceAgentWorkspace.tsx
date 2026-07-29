"use client";

import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Phone,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  VoiceAgentProfile,
  VoiceCallRecord,
} from "@/lib/voice-agents/types";
import BrowserVoiceSession from "./BrowserVoiceSession";

type Language = "en" | "es";

const copy = {
  en: {
    subtitle:
      "Create a customer-managed ElevenLabs agent, talk to it in the browser, and attach signed post-call transcripts to ALMA CRM.",
    security:
      "Your API key is encrypted server-side and never returned to the browser.",
    connectTitle: "1. Connect your ElevenLabs account",
    connectBody:
      "Create an ElevenLabs API key in your ElevenLabs dashboard. Paste it here—not in chat. ALMA does not resell the provider usage.",
    apiKey: "ElevenLabs API key",
    webhookSecret: "ElevenLabs webhook secret",
    connect: "Validate and connect",
    updateConnection: "Rotate key or configure webhook",
    connected: "ElevenLabs connected",
    webhook: "Webhook URL",
    webhookHelp:
      "Add this URL as a post-call webhook in ElevenLabs and enter the same signing secret above.",
    createTitle: "2. Create your voice agent",
    name: "Agent name",
    greeting: "First greeting",
    prompt: "Business instructions and escalation rules",
    receptionist: "Receptionist",
    assistant: "Assistant",
    transcriber: "Call transcriber",
    english: "English",
    spanish: "Spanish",
    bilingual: "Bilingual",
    create: "Create in ElevenLabs",
    agents: "Your agents",
    calls: "CRM call history",
    noAgents: "No voice agents have been created.",
    noCalls:
      "Signed post-call transcripts will appear here after the webhook is configured.",
    phoneTitle: "3. Add a phone number (optional)",
    phoneBody:
      "For real inbound or outbound calls, import an active Twilio number into ElevenLabs and assign it to this agent. Twilio and ElevenLabs bill the customer directly.",
    openElevenLabs: "Open ElevenLabs",
    working: "Working...",
    error: "The voice agent service is unavailable.",
    disclosure:
      "You are responsible for call-recording, consent, telemarketing, and AI-disclosure laws in every jurisdiction where you operate.",
  },
  es: {
    subtitle:
      "Crea un agente de ElevenLabs administrado por el cliente, habla con él en el navegador y guarda transcripciones firmadas en el CRM de ALMA.",
    security: "Tu clave se cifra en el servidor y nunca regresa al navegador.",
    connectTitle: "1. Conecta tu cuenta de ElevenLabs",
    connectBody:
      "Crea una clave API en ElevenLabs. Pégala aquí, no en el chat. ALMA no revende el consumo del proveedor.",
    apiKey: "Clave API de ElevenLabs",
    webhookSecret: "Secreto del webhook de ElevenLabs",
    connect: "Validar y conectar",
    updateConnection: "Cambiar clave o configurar webhook",
    connected: "ElevenLabs conectado",
    webhook: "URL del webhook",
    webhookHelp:
      "Agrega esta URL como webhook post-llamada en ElevenLabs e ingresa el mismo secreto de firma arriba.",
    createTitle: "2. Crea tu agente de voz",
    name: "Nombre del agente",
    greeting: "Saludo inicial",
    prompt: "Instrucciones del negocio y reglas para escalar",
    receptionist: "Recepcionista",
    assistant: "Asistente",
    transcriber: "Transcriptor de llamadas",
    english: "Inglés",
    spanish: "Español",
    bilingual: "Bilingüe",
    create: "Crear en ElevenLabs",
    agents: "Tus agentes",
    calls: "Historial de llamadas en CRM",
    noAgents: "Aún no hay agentes de voz.",
    noCalls:
      "Las transcripciones firmadas aparecerán aquí después de configurar el webhook.",
    phoneTitle: "3. Agrega un número (opcional)",
    phoneBody:
      "Para llamadas reales, importa un número activo de Twilio en ElevenLabs y asígnalo al agente. Twilio y ElevenLabs cobran directamente al cliente.",
    openElevenLabs: "Abrir ElevenLabs",
    working: "Procesando...",
    error: "El servicio de agentes de voz no está disponible.",
    disclosure:
      "Eres responsable de las leyes de grabación, consentimiento, telemercadeo y divulgación de IA en cada jurisdicción.",
  },
} as const;

export default function VoiceAgentWorkspace({
  language,
}: {
  language: Language;
}) {
  const t = copy[language];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [agents, setAgents] = useState<VoiceAgentProfile[]>([]);
  const [calls, setCalls] = useState<VoiceCallRecord[]>([]);
  const [connection, setConnection] = useState({
    apiKey: "",
    webhookSecret: "",
  });
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const webhookUrl = "/api/voice-agents/webhooks/elevenlabs";
  const [agent, setAgent] = useState({
    name: "",
    agentType: "receptionist",
    language: "en",
    greeting: "",
    systemPrompt: "",
  });
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [connectionResponse, agentsResponse] = await Promise.all([
        fetch("/api/voice-agents/connection", { cache: "no-store" }),
        fetch("/api/voice-agents", { cache: "no-store" }),
      ]);
      const [connectionPayload, agentsPayload] = await Promise.all([
        connectionResponse.json(),
        agentsResponse.json(),
      ]);
      if (!connectionResponse.ok || !agentsResponse.ok)
        throw new Error("unavailable");
      setConnected(Boolean(connectionPayload.connection?.connected));
      setWebhookConfigured(
        Boolean(connectionPayload.connection?.webhookConfigured),
      );
      setAgents(agentsPayload.agents ?? []);
      setCalls(agentsPayload.calls ?? []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect() {
    setSaving(true);
    try {
      const response = await fetch("/api/voice-agents/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connection),
      });
      if (!response.ok) throw new Error("failed");
      setConnection({ apiKey: "", webhookSecret: "" });
      setShowConnectionForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function createAgent() {
    setSaving(true);
    try {
      const response = await fetch("/api/voice-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });
      if (!response.ok) throw new Error("failed");
      setAgent({
        name: "",
        agentType: "receptionist",
        language: "en",
        greeting: "",
        systemPrompt: "",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="p-10 text-center text-sm text-[#667085]">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        {t.working}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
      <p className="max-w-3xl text-lg text-[#667085]">{t.subtitle}</p>
      <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#667085]">
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        {t.security}
      </p>
      {failed ? (
        <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {t.error}
        </p>
      ) : null}

      <section className="mt-6 rounded-[24px] border border-[#E4E7EC] bg-white p-6">
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          ) : (
            <KeyRound className="h-5 w-5" />
          )}
          <h2 className="text-lg font-medium">
            {connected ? t.connected : t.connectTitle}
          </h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
          {t.connectBody}
        </p>
        {!connected || showConnectionForm || !webhookConfigured ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="password"
              autoComplete="off"
              value={connection.apiKey}
              onChange={(event) =>
                setConnection((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              placeholder={t.apiKey}
              className="rounded-xl border px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              autoComplete="off"
              value={connection.webhookSecret}
              onChange={(event) =>
                setConnection((current) => ({
                  ...current,
                  webhookSecret: event.target.value,
                }))
              }
              placeholder={t.webhookSecret}
              className="rounded-xl border px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              disabled={saving || !connection.apiKey}
              onClick={() => void connect()}
              className="w-fit rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? t.working : t.connect}
            </button>
          </div>
        ) : null}
        {connected && webhookConfigured && !showConnectionForm ? (
          <button
            type="button"
            onClick={() => setShowConnectionForm(true)}
            className="mt-4 rounded-full border px-4 py-2 text-xs"
          >
            {t.updateConnection}
          </button>
        ) : null}
        <div className="mt-5 rounded-2xl bg-[#F9FAFB] p-4">
          <p className="text-xs font-medium">{t.webhook}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(
                  `${window.location.origin}${webhookUrl}`,
                )
              }
              className="rounded-full border bg-white p-2"
              aria-label="Copy webhook URL"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[#667085]">
            {t.webhookHelp} {webhookConfigured ? "✓" : ""}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-[#E4E7EC] bg-white p-6">
        <h2 className="text-lg font-medium">{t.createTitle}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={agent.name}
            onChange={(event) =>
              setAgent((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={t.name}
            className="rounded-xl border px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={agent.agentType}
              onChange={(event) =>
                setAgent((current) => ({
                  ...current,
                  agentType: event.target.value,
                }))
              }
              className="rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="receptionist">{t.receptionist}</option>
              <option value="assistant">{t.assistant}</option>
              <option value="transcriber">{t.transcriber}</option>
            </select>
            <select
              value={agent.language}
              onChange={(event) =>
                setAgent((current) => ({
                  ...current,
                  language: event.target.value,
                }))
              }
              className="rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="en">{t.english}</option>
              <option value="es">{t.spanish}</option>
              <option value="bilingual">{t.bilingual}</option>
            </select>
          </div>
          <textarea
            value={agent.greeting}
            onChange={(event) =>
              setAgent((current) => ({
                ...current,
                greeting: event.target.value,
              }))
            }
            placeholder={t.greeting}
            className="min-h-24 rounded-xl border px-3 py-2.5 text-sm"
          />
          <textarea
            value={agent.systemPrompt}
            onChange={(event) =>
              setAgent((current) => ({
                ...current,
                systemPrompt: event.target.value,
              }))
            }
            placeholder={t.prompt}
            className="min-h-24 rounded-xl border px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={
            saving ||
            !connected ||
            !agent.name ||
            !agent.greeting ||
            !agent.systemPrompt
          }
          onClick={() => void createAgent()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {saving ? t.working : t.create}
        </button>
      </section>

      <section className="mt-5">
        <h2 className="text-lg font-medium">{t.agents}</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {agents.length ? (
            agents.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-[#E4E7EC] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5" />
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-xs text-[#667085]">
                        {item.agent_type} · {item.language} · {item.status}
                      </p>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <p className="my-4 text-sm text-[#667085]">{item.greeting}</p>
                <BrowserVoiceSession agentId={item.id} language={language} />
              </article>
            ))
          ) : (
            <p className="rounded-2xl border bg-white p-6 text-sm text-[#667085]">
              {t.noAgents}
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-[#E4E7EC] bg-white p-6">
        <h2 className="text-lg font-medium">{t.phoneTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
          {t.phoneBody}
        </p>
        <a
          href="https://elevenlabs.io/app/conversational-ai"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-black px-4 py-2 text-sm"
        >
          <Phone className="h-4 w-4" />
          {t.openElevenLabs}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      <section className="mt-5 rounded-[24px] border border-[#E4E7EC] bg-white">
        <h2 className="border-b p-5 text-lg font-medium">{t.calls}</h2>
        {calls.length ? (
          <div className="divide-y">
            {calls.map((call) => (
              <article key={call.id} className="p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="font-medium">
                    {call.caller_phone || call.direction} ·{" "}
                    {call.duration_seconds ?? 0}s
                  </p>
                  <span className="text-xs text-[#667085]">
                    {new Date(call.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#667085]">
                  {call.summary || call.transcript_text || call.status}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-8 text-sm text-[#667085]">{t.noCalls}</p>
        )}
      </section>
      <p className="mt-5 text-xs leading-5 text-[#667085]">{t.disclosure}</p>
    </div>
  );
}
