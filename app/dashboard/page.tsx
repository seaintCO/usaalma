"use client";

import {
  ArrowUp,
  Menu,
  Paperclip,
  PenSquare,
  Search,
  Camera,
  Presentation,
} from "lucide-react";
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

function cleanAIText(text: string) {
  return text
    .replace(/^#{1,6}\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/---/g, "")
    .trim();
}

function renderMessage(content: string) {
  const imageMatch = content.match(/\[ALMA_IMAGE:(.*?)\]/);

  if (imageMatch?.[1]) {
    return (
      <div className="space-y-3">
        <img
          src={`data:image/png;base64,${imageMatch[1]}`}
          className="w-full max-h-[70vh] rounded-2xl border border-[#E5E7EB] object-contain shadow-sm"
          alt="ALMA generated image"
        />
        <p className="text-[#6B7280]">
          Imagen generada. Puedes pedirme cambios como: Ã¢â‚¬Å“hazlo mÃƒÂ¡s
          realistaÃ¢â‚¬Â, Ã¢â‚¬Å“en 16:9Ã¢â‚¬Â, Ã¢â‚¬Å“fondo negroÃ¢â‚¬Â, o
          Ã¢â‚¬Å“estilo anuncio premiumÃ¢â‚¬Â.
        </p>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap leading-7">{cleanAIText(content)}</div>
  );
}

type AlmaLanguage = "en" | "es";

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
    active: "Active",
    pro: "Pro",
    home: "Home",
    planner: "Planner",
    tasks: "Tasks",
    notes: "Notes",
    documents: "Documentos",
    fitness: "Fitness",
    crm: "CRM",
    invoices: "Invoices",
    alma: "ALMA",
    images: "Images",
    creativeStudio: "Creative Studio",
    launchStudio: "Launch Studio",
    trader: "Trader",
    marketplace: "Marketplace",
    billing: "Billing",
    settings: "Settings",
    greeting: "Good morning.",
    identity: "I am ALMA.",
    subtitle: "Chat, images, documents, code, and automation in one place.",
    prompt: "Ask ALMA to create, edit, write, or build...",
    disclaimer: "ALMA can make mistakes. Verify important information.",
    chipImage: "Create a premium image",
    chipLogo: "Make a logo",
    chipAd: "Generate a 16:9 ad",
    chipCode: "Write code",
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
    active: "Activo",
    pro: "Pro",
    home: "Inicio",
    planner: "Planificador",
    tasks: "Tareas",
    notes: "Notas",
    documents: "Documentos",
    fitness: "Fitness",
    crm: "CRM",
    invoices: "Facturas",
    alma: "ALMA",
    images: "Imagenes",
    creativeStudio: "Estudio Creativo",
    launchStudio: "Launch Studio",
    trader: "Trader",
    marketplace: "Marketplace",
    billing: "Pagos",
    settings: "Configuracion",
    greeting: "Buenos dias.",
    identity: "Soy ALMA.",
    subtitle:
      "Chat, imagenes, documentos, codigo y automatizacion en un solo lugar.",
    prompt: "Pidele a ALMA crear, editar, escribir o construir...",
    disclaimer: "ALMA puede cometer errores. Verifica informacion importante.",
    chipImage: "Crea una imagen premium",
    chipLogo: "Haz un logo",
    chipAd: "Genera un anuncio 16:9",
    chipCode: "Escribe codigo",
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
  const [history, setHistory] = useState<any[]>([]);
  const [conversationStatuses, setConversationStatuses] = useState<
    Record<string, { active?: boolean; unread?: boolean; failed?: boolean }>
  >({});
  const [installedCORE, setInstalledCORE] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeWorkspace, setActiveWorkspace] =
    useState<AlmaWorkspaceNavigationKey>("chat");
  const [language, setLanguage] = useState<AlmaLanguage>("en");
  const [durableChatEnabled, setDurableChatEnabled] = useState(false);
  const t = almaText[language];

  function updateLanguage(next: AlmaLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  async function loadHistory() {
    const res = await fetch("/api/conversation/list");
    const data = await res.json();
    if (Array.isArray(data)) setHistory(data);
  }

  async function loadInstalledCORE() {
    const res = await fetch("/api/CORE/list");
    const data = await res.json();
    if (Array.isArray(data))
      setInstalledCORE(data.filter((m: any) => m.installed));
  }

  function mergeConversationState(
    persisted: ChatMessage[],
    runs: any[],
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
          runId: run.runId,
          executionId: run.executionId,
          createdAt: persistedAssistant.created_at,
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
            runId: run.runId,
            executionId: run.executionId,
            createdAt: run.updatedAt,
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
          runId: run.runId,
          executionId: run.executionId,
          createdAt: run.updatedAt,
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
        const loaded = data.filter(
          (message: any) => typeof message.id === "string",
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
      Object.fromEntries(data.map((item: any) => [item.conversationId, item])),
    );
  }

  function selectConversation(id: string, replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
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

  async function renameConversation(id: string) {
    if (!editingTitle.trim()) return;
    await fetch("/api/conversation/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id, title: editingTitle }),
    });
    setEditingId(null);
    setEditingTitle("");
    loadHistory();
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

  useEffect(() => {
    async function checkOnboarding() {
      const res = await fetch("/api/onboarding/status");
      const data = await res.json();

      if (data && data.completed === false) {
        window.location.href = "/onboarding";
        return;
      }

      const billingRes = await fetch("/api/billing/required");
      const billing = await billingRes.json();

      if (billing.required) {
        window.location.href = "/billing";
        return;
      }

      loadHistory();
      loadConversationStatuses();
      loadInstalledCORE();
      const durableRes = await fetch("/api/chat/runs/config");
      if (durableRes.ok)
        setDurableChatEnabled(
          Boolean((await durableRes.json()).durableChatEnabled),
        );
      setAuthReady(true);
    }

    const savedLanguage = localStorage.getItem("alma_language");
    if (savedLanguage === "en" || savedLanguage === "es") {
      setLanguage(savedLanguage);
    }

    checkOnboarding();
    const syncConversation = () => {
      const id = new URLSearchParams(window.location.search).get(
        "conversation",
      );
      if (id) void loadConversation(id);
      else {
        conversationRequest.current?.abort();
        setConversationId(null);
        setMessages([]);
      }
    };
    syncConversation();
    window.addEventListener("popstate", syncConversation);
    return () => window.removeEventListener("popstate", syncConversation);
  }, []);
  useEffect(() => {
    if (!Object.values(conversationStatuses).some((status) => status.active))
      return;
    const timer = setInterval(() => {
      void loadConversationStatuses();
    }, 3000);
    return () => clearInterval(timer);
  }, [conversationStatuses]);

  function Sidebar() {
    return (
      <aside className="flex h-full w-72 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:w-64">
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
        </div>

        <div className="px-3">
          <ConversationNewChatButton
            label={t.newChat}
            onNewChat={startNewChat}
          />

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              placeholder={t.search}
              className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-black"
            />
          </div>
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
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <div className="text-center">
          <div className="text-3xl font-medium tracking-tight">ALMA</div>
          <div className="mt-2 text-sm text-[#6B7280]">{t.loading}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-white text-[#111111]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

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
          <button
            onClick={startNewChat}
            className="rounded-lg p-2 hover:bg-[#F7F7F8]"
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        {activeWorkspace === "home" ? (
          <OperatingDashboard
            language={language}
            onAsk={() => setActiveWorkspace("chat")}
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
          />
        )}
      </section>
    </main>
  );
}
