"use client";

import { Inbox, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import BilingualComposer from "@/components/communications/BilingualComposer";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type Thread = {
  id: string;
  channel: "email" | "whatsapp";
  provider: string;
  customer_display_name: string | null;
  contact_address: string;
  detected_language: string | null;
  unread_count: number;
  last_activity_at: string;
  delivery_state: string;
};

type LoadState = "loading" | "ready" | "auth" | "error";

const COPY = {
  en: {
    title: "Communications",
    subtitle: "Email, WhatsApp, and future customer threads in one safe inbox.",
    loading: "Loading inbox...",
    auth: "Sign in to view communications.",
    error: "Communications are temporarily unavailable.",
    retry: "Retry",
    empty: "No communication threads yet.",
    original: "Original",
    translated: "Translated",
    reply: "Reply draft",
    prepare: "Prepare WhatsApp approval",
    connect: "Connect WhatsApp Business",
    awaiting: "Approval created. Review it in Approvals.",
  },
  es: {
    title: "Comunicaciones",
    subtitle:
      "Correo, WhatsApp y futuros mensajes de clientes en una bandeja segura.",
    loading: "Cargando bandeja...",
    auth: "Inicia sesion para ver comunicaciones.",
    error: "Comunicaciones no esta disponible temporalmente.",
    retry: "Reintentar",
    empty: "Aun no hay conversaciones.",
    original: "Original",
    translated: "Traducido",
    reply: "Borrador de respuesta",
    prepare: "Preparar aprobacion de WhatsApp",
    connect: "Conectar WhatsApp Business",
    awaiting: "Aprobacion creada. Revisala en Aprobaciones.",
  },
} as const;

export default function CommunicationsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [state, setState] = useState<LoadState>("loading");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [threadsResponse, languageResponse] = await Promise.all([
        fetch("/api/communications/threads", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      if (threadsResponse.status === 401) {
        setState("auth");
      } else if (!threadsResponse.ok) {
        setState("error");
      } else {
        const payload = await threadsResponse.json();
        const nextThreads = payload.threads ?? [];
        setThreads(nextThreads);
        setSelectedId((current) => current ?? nextThreads[0]?.id ?? null);
        setState("ready");
      }
      if (languageResponse.ok) {
        const payload = await languageResponse.json();
        setLanguage(payload.language === "es" ? "es" : "en");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) ?? null,
    [selectedId, threads],
  );

  async function prepareWhatsApp() {
    if (!selected || !draft.trim()) return;
    const response = await fetch("/api/communications/whatsapp/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: selected.id,
        message: draft,
        language,
      }),
    });
    if (response.ok) {
      setMessage(copy.awaiting);
      setDraft("");
      return;
    }
    setState("error");
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <Inbox className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280] md:text-base">
              {copy.subtitle}
            </p>
          </header>

          {state === "loading" ? (
            <StateCard text={copy.loading} spinning />
          ) : null}
          {state === "auth" || state === "error" ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth" ? copy.auth : copy.error}
              </p>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          ) : null}

          {state === "ready" ? (
            <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-2">
                {threads.length ? (
                  threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedId(thread.id)}
                      className={`block w-full rounded-2xl border p-4 text-left ${
                        selectedId === thread.id
                          ? "border-black bg-white"
                          : "border-[#E5E7EB] bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold">
                          {thread.customer_display_name ??
                            thread.contact_address}
                        </span>
                        <span className="rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px]">
                          {thread.channel}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-[#6B7280]">
                        {thread.contact_address}
                      </p>
                      <p className="mt-2 text-xs text-[#6B7280]">
                        {thread.unread_count} unread / {thread.delivery_state}
                      </p>
                    </button>
                  ))
                ) : (
                  <StateCard text={copy.empty} />
                )}
              </div>

              <article className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4">
                {selected ? (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <h2 className="truncate text-lg font-semibold">
                        {selected.customer_display_name ??
                          selected.contact_address}
                      </h2>
                    </div>
                    <BilingualComposer
                      channel="whatsapp"
                      initialText={draft}
                      language={language}
                      onUse={(value) => setDraft(value)}
                    />
                    <label className="mt-4 block">
                      <span className="mb-1 block text-xs font-medium text-[#6B7280]">
                        {copy.reply}
                      </span>
                      <textarea
                        value={draft}
                        rows={5}
                        onChange={(event) => setDraft(event.target.value)}
                        className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-3 text-sm outline-none focus:border-black"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void prepareWhatsApp()}
                      disabled={
                        !draft.trim() || selected.channel !== "whatsapp"
                      }
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
                    >
                      <Send className="h-4 w-4" />
                      {copy.prepare}
                    </button>
                    {message ? (
                      <p className="mt-3 text-sm text-[#6B7280]">{message}</p>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <StateCard text={copy.empty} />
                    <a
                      href="/api/connectors/whatsapp/start?returnTo=%2Fcommunications"
                      className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-black px-3 text-sm font-medium text-white"
                    >
                      {copy.connect}
                    </a>
                  </div>
                )}
              </article>
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}

function StateCard({ spinning, text }: { spinning?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
      <Loader2 className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {text}
    </div>
  );
}
