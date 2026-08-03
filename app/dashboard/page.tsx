"use client";

import { Menu, PenSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  WORKSPACE_ROUTES,
  type RoutedWorkspace,
} from "@/lib/platform/workspaceRoutes";
import { useRouter } from "next/navigation";
import ChatWorkspace, {
  type ChatMessage,
} from "@/components/dashboard-chat/ChatWorkspace";
import OperatingDashboard from "@/components/dashboard-home/OperatingDashboard";
import ConversationNavigation, {
  ConversationNewChatButton,
} from "@/components/alma-shell/ConversationNavigation";
import WorkspaceNavigation from "@/components/alma-shell/WorkspaceNavigation";
import AlmaMobileDrawer from "@/components/alma-shell/AlmaMobileDrawer";
import type { AlmaWorkspaceNavigationKey } from "@/components/alma-shell/types";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import AlmaThemeToggle from "@/components/theme/AlmaThemeToggle";

type AlmaLanguage = "en" | "es";

type DashboardConversation = {
  id: string;
  title: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ConversationStatusResponse = {
  conversationId: string;
  active?: boolean;
  unread?: boolean;
  failed?: boolean;
};

type PersistedChatMessage = ChatMessage & {
  created_at?: string | null;
};

type ChatRunSummary = {
  id?: string;
  status: string;
  runId?: string;
  executionId: string;
  updatedAt?: string | null;
  assistantMessage?: {
    id: string;
    content?: string | null;
    created_at?: string | null;
  } | null;
};

const almaText = {
  en: {
    language: "Language",
    newChat: "New Chat",
    search: "Search...",
    history: "History",
    core: "Core",
    business: "Business",
    ai: "AI",
    platform: "Platform",
    primary: "Primary",
    secondary: "Secondary",
    myApps: "My Apps",
    viewAllApps: "View all apps",
    active: "Active",
    pro: "Pro",
    beta: "Beta",
    included: "Included",
    upgradeRequired: "Upgrade",
    comingSoon: "Soon",
    unavailable: "Unavailable",
    home: "Home",
    customers: "Customers",
    inbox: "Inbox",
    work: "Work",
    money: "Money",
    automations: "Automations",
    knowledge: "Knowledge",
    reports: "Reports",
    more: "More",
    approvals: "Approvals",
    files: "Files",
    apps: "Apps",
    connections: "Connections",
    profile: "Profile",
    planner: "Planner",
    tasks: "Tasks",
    notes: "Notes",
    documents: "Documentos",
    fitness: "Fitness",
    crm: "CRM",
    construction: "Construction",
    invoices: "Invoices",
    alma: "ALMA",
    images: "Images",
    creativeStudio: "Creative Studio",
    launchStudio: "Launch Studio",
    trader: "Trader",
    agentBuilder: "Agent Builder",
    marketplace: "Marketplace",
    billing: "Billing",
    settings: "Settings",
    greeting: "Good morning.",
    identity: "I am ALMA.",
    subtitle:
      "Manage customers, conversations, money, tasks, and daily operations.",
    prompt: "Ask ALMA about your customers, work, or money...",
    disclaimer: "ALMA can make mistakes. Verify important information.",
    chipImage: "Show overdue invoices",
    chipLogo: "Draft a customer follow-up",
    chipAd: "Find expenses missing receipts",
    chipCode: "Plan today's work",
    loading: "Loading your workspace...",
  },
  es: {
    language: "Idioma",
    newChat: "Nuevo Chat",
    search: "Buscar...",
    history: "Historial",
    core: "Core",
    business: "Negocio",
    ai: "IA",
    platform: "Plataforma",
    primary: "Principal",
    secondary: "Secundario",
    myApps: "Mis aplicaciones",
    viewAllApps: "Ver todas las aplicaciones",
    active: "Activo",
    pro: "Pro",
    beta: "Beta",
    included: "Incluido",
    upgradeRequired: "Mejora",
    comingSoon: "Pronto",
    unavailable: "No disponible",
    home: "Inicio",
    customers: "Clientes",
    inbox: "Bandeja",
    work: "Trabajo",
    money: "Dinero",
    automations: "Automatizaciones",
    knowledge: "Conocimiento",
    reports: "Reportes",
    more: "Más",
    approvals: "Aprobaciones",
    files: "Archivos",
    apps: "Apps",
    connections: "Conexiones",
    profile: "Perfil",
    planner: "Planificador",
    tasks: "Tareas",
    notes: "Notas",
    documents: "Documentos",
    fitness: "Fitness",
    crm: "CRM",
    construction: "Construccion",
    invoices: "Facturas",
    alma: "ALMA",
    images: "Imagenes",
    creativeStudio: "Estudio Creativo",
    launchStudio: "Launch Studio",
    trader: "Trader",
    agentBuilder: "Agent Builder",
    marketplace: "Marketplace",
    billing: "Pagos",
    settings: "Configuracion",
    greeting: "Buenos dias.",
    identity: "Soy ALMA.",
    subtitle:
      "Administra clientes, conversaciones, dinero, tareas y operaciones diarias.",
    prompt: "Pregúntale a ALMA sobre tus clientes, trabajo o dinero...",
    disclaimer: "ALMA puede cometer errores. Verifica informacion importante.",
    chipImage: "Muestra facturas vencidas",
    chipLogo: "Redacta seguimiento para un cliente",
    chipAd: "Busca gastos sin recibo",
    chipCode: "Planifica el trabajo de hoy",
    loading: "Cargando tu espacio...",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const launchPrompt =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("prompt") ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [streamEpoch, setStreamEpoch] = useState(0);
  const conversationCache = useRef(new Map<string, ChatMessage[]>());
  const conversationRequest = useRef<AbortController | null>(null);
  const [history, setHistory] = useState<DashboardConversation[]>([]);
  const [conversationStatuses, setConversationStatuses] = useState<
    Record<string, { active?: boolean; unread?: boolean; failed?: boolean }>
  >({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] =
    useState<AlmaWorkspaceNavigationKey>(launchPrompt ? "chat" : "home");
  const { locale: language, setLocale } = useAlmaLocale();
  const [durableChatEnabled, setDurableChatEnabled] = useState(false);
  const t = almaText[language];

  function updateLanguage(next: AlmaLanguage) {
    void setLocale(next);
  }

  async function loadHistory() {
    const res = await fetch("/api/conversation/list");
    const data = await res.json();
    if (Array.isArray(data)) setHistory(data);
  }

  function mergeConversationState(
    persisted: ChatMessage[],
    runs: ChatRunSummary[],
  ): ChatMessage[] {
    const withoutLegacyDrafts = persisted.filter(
      (message) =>
        !(
          message.role === "assistant" &&
          /ALMA is thinking|ALMA est.{1,2} pensando/i.test(message.content)
        ),
    );
    const byExecution = new Map<string, ChatMessage>();
    const byId = new Map<string, ChatMessage>();
    for (const message of withoutLegacyDrafts) {
      byId.set(message.id, message);
      if (message.executionId) byExecution.set(message.executionId, message);
    }
    for (const run of runs) {
      const persistedAssistant = run.assistantMessage;
      if (persistedAssistant) {
        const message: ChatMessage = {
          id: persistedAssistant.id,
          role: "assistant",
          content: persistedAssistant.content ?? "",
          status:
            run.status === "failed"
              ? "error"
              : run.status === "completed"
                ? undefined
                : "streaming",
          runId: run.runId ?? run.id,
          executionId: run.executionId,
          createdAt: persistedAssistant.created_at ?? undefined,
        };
        const existing = byExecution.get(run.executionId);
        if (existing) byId.delete(existing.id);
        byExecution.set(run.executionId, message);
        byId.set(message.id, message);
      } else if (run.status === "queued" || run.status === "running") {
        const existing = byExecution.get(run.executionId);
        if (!existing) {
          const draft: ChatMessage = {
            id: `draft-${run.executionId}`,
            role: "assistant",
            content: "",
            status: "streaming",
            runId: run.runId ?? run.id,
            executionId: run.executionId,
            createdAt: run.updatedAt ?? undefined,
          };
          byExecution.set(run.executionId, draft);
          byId.set(draft.id, draft);
        }
      } else if (run.status === "failed" && !byExecution.has(run.executionId)) {
        const failed: ChatMessage = {
          id: `draft-${run.executionId}`,
          role: "assistant",
          content:
            language === "es"
              ? "ALMA no pudo completar la respuesta."
              : "ALMA could not complete the response.",
          status: "error",
          runId: run.runId ?? run.id,
          executionId: run.executionId,
          createdAt: run.updatedAt ?? undefined,
        };
        byExecution.set(run.executionId, failed);
        byId.set(failed.id, failed);
      }
    }
    return [...byId.values()].sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    );
  }
  async function loadConversation(id: string) {
    setActiveWorkspace("chat");
    setStreamEpoch((value) => value + 1);
    setConversationId(id);
    setConversationStatuses((current) => ({
      ...current,
      [id]: { ...current[id], unread: false },
    }));
    void fetch(`/api/chat/conversations/${id}/read`, { method: "POST" }).catch(
      () => {
        void loadConversationStatuses();
      },
    );
    setSidebarOpen(false);
    conversationRequest.current?.abort();
    const cached = conversationCache.current.get(id);
    const controller = new AbortController();
    conversationRequest.current = controller;
    setConversationLoading(true);
    try {
      const [messageResponse, runResponse] = await Promise.all([
        cached
          ? Promise.resolve(null)
          : fetch("/api/conversation/load", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId: id }),
              signal: controller.signal,
            }),
        fetch(`/api/chat/conversations/${id}/runs`, {
          signal: controller.signal,
        }),
      ]);
      const data = messageResponse ? await messageResponse.json() : cached;
      const runs = runResponse.ok ? await runResponse.json() : [];
      if (
        !controller.signal.aborted &&
        Array.isArray(data) &&
        Array.isArray(runs)
      ) {
        const loaded = (data as PersistedChatMessage[]).filter(
          (message) => typeof message.id === "string",
        );
        const merged = mergeConversationState(loaded, runs);
        conversationCache.current.set(id, merged);
        setMessages(merged);
      }
    } finally {
      if (!controller.signal.aborted) setConversationLoading(false);
    }
  }
  async function loadConversationStatuses() {
    const res = await fetch("/api/chat/conversation-status");
    if (!res.ok) return;
    const data = await res.json();
    setConversationStatuses(
      Object.fromEntries(
        (data as ConversationStatusResponse[]).map((item) => [
          item.conversationId,
          item,
        ]),
      ),
    );
  }

  function selectConversation(id: string, replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setActiveWorkspace("chat");
    void loadConversation(id);
  }

  function startNewChat() {
    setStreamEpoch((value) => value + 1);
    conversationRequest.current?.abort();
    const url = new URL(window.location.href);
    url.searchParams.delete("conversation");
    window.history.pushState({}, "", url);
    setActiveWorkspace("chat");
    setMessages([]);
    setConversationId(null);
    setSidebarOpen(false);
  }

  function openWorkspace(key: RoutedWorkspace) {
    setSidebarOpen(false);
    router.push(WORKSPACE_ROUTES[key]);
  }

  async function deleteConversation(id: string) {
    await fetch("/api/conversation/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    });
    if (conversationId === id) {
      setMessages([]);
      setConversationId(null);
    }
    loadHistory();
  }

  async function analyzeFile(file: File) {
    setMessages((prev) => [
      ...prev,
      {
        id: `file-${Date.now()}-user`,
        role: "user",
        content: `Analyze uploaded file: ${file.name}`,
      },
    ]);

    const form = new FormData();
    form.append("file", file);
    form.append(
      "question",
      "Analyze this like ChatGPT. If it is an image, describe it and give useful insights. If it is a document, summarize it and extract important action items.",
    );

    const res = await fetch("/api/files/analyze", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        id: `file-${Date.now()}-assistant`,
        role: "assistant",
        content: data.answer || data.error || "I could not analyze this file.",
      },
    ]);
  }

  function addLiveCameraObservation(answer: string) {
    const timestamp = Date.now();
    setMessages((previous) => [
      ...previous,
      {
        id: `live-camera-${timestamp}-user`,
        role: "user",
        content:
          language === "es"
            ? "Guardar la observación de la cámara en vivo."
            : "Save the Live Camera observation.",
      },
      {
        id: `live-camera-${timestamp}-assistant`,
        role: "assistant",
        content: answer,
      },
    ]);
  }

  useEffect(() => {
    async function checkOnboarding() {
      const res = await fetch("/api/onboarding/status");
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }

      if (data && data.completed === false) {
        window.location.href = "/onboarding";
        return;
      }

      const billingRes = await fetch("/api/billing/required");
      const billing = await billingRes.json();
      if (billingRes.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }

      if (billingRes.ok && billing.required) {
        window.location.href = "/billing";
        return;
      }

      loadHistory();
      loadConversationStatuses();
      const durableRes = await fetch("/api/chat/runs/config");
      if (durableRes.ok)
        setDurableChatEnabled(
          Boolean((await durableRes.json()).durableChatEnabled),
        );
      setAuthReady(true);
    }

    checkOnboarding();
    const syncConversation = () => {
      const id = new URLSearchParams(window.location.search).get(
        "conversation",
      );
      if (id) {
        setActiveWorkspace("chat");
        void loadConversation(id);
      } else {
        conversationRequest.current?.abort();
        setConversationId(null);
        setMessages([]);
      }
    };
    syncConversation();
    window.addEventListener("popstate", syncConversation);
    return () => window.removeEventListener("popstate", syncConversation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!Object.values(conversationStatuses).some((status) => status.active))
      return;
    const timer = setInterval(() => {
      void loadConversationStatuses();
    }, 3000);
    return () => clearInterval(timer);
  }, [conversationStatuses]);

  function renderSidebar() {
    return (
      <aside className="alma-sidebar flex h-full w-72 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:w-64">
        <div className="px-5 pb-4 pt-5">
          <button
            onClick={() => {
              setActiveWorkspace("chat");
              setSidebarOpen(false);
            }}
            className="text-left"
          >
            <div className="text-lg font-medium tracking-tight">ALMA</div>
            <div className="text-[10px] text-[#6B7280]">Powered by SEAINT</div>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => updateLanguage("en")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium ${language === "en" ? "bg-black text-white" : "text-[#6B7280] hover:text-black"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => updateLanguage("es")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium ${language === "es" ? "bg-black text-white" : "text-[#6B7280] hover:text-black"}`}
            >
              ES
            </button>
          </div>
          <div className="mt-2">
            <AlmaThemeToggle />
          </div>
        </div>

        <div className="px-3">
          <ConversationNewChatButton
            label={t.newChat}
            onNewChat={startNewChat}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8 text-sm">
          <ConversationNavigation
            conversations={history}
            selectedConversationId={conversationId}
            statuses={conversationStatuses}
            heading={t.history}
            newChatLabel={t.newChat}
            deleteLabel="Delete"
            onConversationSelect={selectConversation}
            onConversationDelete={deleteConversation}
          />

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <WorkspaceNavigation
            activeWorkspace={activeWorkspace}
            labels={t}
            onHome={() => {
              setActiveWorkspace("home");
              setSidebarOpen(false);
            }}
            onAskAlma={() => {
              setActiveWorkspace("chat");
              setSidebarOpen(false);
            }}
            onWorkspaceNavigate={openWorkspace}
          />
        </div>
      </aside>
    );
  }

  if (!authReady) {
    return (
      <main className="alma-premium-root flex min-h-screen items-center justify-center bg-white text-black">
        <div className="text-center">
          <div className="text-3xl font-medium tracking-tight">ALMA</div>
          <div className="mt-2 text-sm text-[#6B7280]">{t.loading}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="alma-premium-root flex h-[100dvh] w-full overflow-hidden bg-white text-[#111111]">
      <div className="hidden md:block">{renderSidebar()}</div>

      <AlmaMobileDrawer
        open={sidebarOpen}
        language={language}
        activeWorkspace={activeWorkspace}
        labels={t}
        conversations={history}
        selectedConversationId={conversationId}
        statuses={conversationStatuses}
        deleteLabel="Delete"
        onMobileClose={() => setSidebarOpen(false)}
        onBrandClick={() => {
          setActiveWorkspace("chat");
          setSidebarOpen(false);
        }}
        onLanguageChange={updateLanguage}
        onNewChat={startNewChat}
        onConversationSelect={selectConversation}
        onConversationDelete={deleteConversation}
        onHome={() => {
          setActiveWorkspace("home");
          setSidebarOpen(false);
        }}
        onAskAlma={() => {
          setActiveWorkspace("chat");
          setSidebarOpen(false);
        }}
        onWorkspaceNavigate={openWorkspace}
      />

      <section className="relative flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-[#F7F7F8]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-medium tracking-tight">ALMA</span>
          <div className="flex items-center gap-1">
            <AlmaThemeToggle compact />
            <button
              onClick={startNewChat}
              className="rounded-lg p-2 hover:bg-[#F7F7F8]"
            >
              <PenSquare className="h-5 w-5" />
            </button>
          </div>
        </div>

        {activeWorkspace === "home" ? (
          <OperatingDashboard
            conversations={history}
            conversationStatuses={conversationStatuses}
            language={language}
            onAsk={(prompt) => {
              if (prompt?.trim()) {
                const url = new URL(window.location.href);
                url.searchParams.set("prompt", prompt.trim());
                window.history.pushState({}, "", url);
              }
              setActiveWorkspace("chat");
            }}
            onConversationSelect={selectConversation}
          />
        ) : (
          <ChatWorkspace
            messages={messages}
            setMessages={setMessages}
            conversationId={conversationId}
            setConversationId={setConversationId}
            language={language}
            setLanguage={updateLanguage}
            streamEpoch={streamEpoch}
            loadingConversation={conversationLoading}
            durableEnabled={durableChatEnabled}
            initialPrompt={launchPrompt}
            onComplete={(completedConversationId) => {
              if (completedConversationId)
                conversationCache.current.delete(completedConversationId);
              void loadHistory();
            }}
            onAnalyzeFile={analyzeFile}
            onLiveCameraObservation={addLiveCameraObservation}
          />
        )}
      </section>
    </main>
  );
}
