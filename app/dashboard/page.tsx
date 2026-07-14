"use client";

import {
  ArrowUp, Calendar, CheckCircle2, CreditCard, FileText, FolderOpen,
  Menu, Mic, Paperclip, PenSquare, PlusCircle, ReceiptText,
  Search, Settings, Store, Users, ImageIcon, Camera, Activity, Rocket, Presentation, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LaunchStudioPanel from "./LaunchStudioPanel";
import TraderPanel from "./TraderPanel";
import ChatWorkspace, { type ChatMessage } from "@/components/dashboard-chat/ChatWorkspace";

const moduleMap:any = {
  planner: ["Planner", Calendar, "/planner"],
  tasks: ["Tasks", CheckCircle2, "/tasks"],
  notes: ["Notes", FileText, "/notes"],
  crm: ["CRM", Users, "/crm"],
  invoicing: ["Invoices", ReceiptText, "/invoicing"],
  documents: ["Documents", FolderOpen, "/documents"],
  launchStudio: ["Launch Studio", Rocket, "/launch-studio"],
};

function cleanAIText(text:string) {
  return text
    .replace(/^#{1,6}\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/---/g, "")
    .trim();
}

function renderMessage(content:string) {
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
          Imagen generada. Puedes pedirme cambios como: Ã¢â‚¬Å“hazlo mÃƒÂ¡s realistaÃ¢â‚¬Â, Ã¢â‚¬Å“en 16:9Ã¢â‚¬Â, Ã¢â‚¬Å“fondo negroÃ¢â‚¬Â, o Ã¢â‚¬Å“estilo anuncio premiumÃ¢â‚¬Â.
        </p>
      </div>
    );
  }

  return <div className="whitespace-pre-wrap leading-7">{cleanAIText(content)}</div>;
}


function InlineAppFrame({ title, src }: { title: string; src: string }) {
  return (
    <div className="h-full w-full bg-[#F7F7F8]">
      <iframe
        title={title}
        src={src}
        key={`${src}-${title}`} className="h-full min-h-screen w-full border-0 bg-[#F7F7F8]"
      />
    </div>
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
    loading: "Loading your workspace..."
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
    subtitle: "Chat, imagenes, documentos, codigo y automatizacion en un solo lugar.",
    prompt: "Pidele a ALMA crear, editar, escribir o construir...",
    disclaimer: "ALMA puede cometer errores. Verifica informacion importante.",
    chipImage: "Crea una imagen premium",
    chipLogo: "Haz un logo",
    chipAd: "Genera un anuncio 16:9",
    chipCode: "Escribe codigo",
    loading: "Cargando tu espacio..."
  }
};

export default function DashboardPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [streamEpoch, setStreamEpoch] = useState(0);
  const conversationCache = useRef(new Map<string, ChatMessage[]>());
  const conversationRequest = useRef<AbortController | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [installedCORE, setInstalledCORE] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<string>("chat");
  const [language, setLanguage] = useState<AlmaLanguage>("en");
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
    if (Array.isArray(data)) setInstalledCORE(data.filter((m:any) => m.installed));
  }

  async function loadConversation(id:string) {
    setStreamEpoch((value) => value + 1);
    setConversationId(id);
    setSidebarOpen(false);
    conversationRequest.current?.abort();
    const cached = conversationCache.current.get(id);
    if (cached) { setMessages(cached); setConversationLoading(false); return; }
    const controller = new AbortController();
    conversationRequest.current = controller;
    setConversationLoading(true);
    try {
      const res = await fetch("/api/conversation/load", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ conversationId:id }), signal:controller.signal });
      const data = await res.json();
      if (!controller.signal.aborted && Array.isArray(data)) {
        const loaded = data.map((message:any, index:number) => ({ ...message, id: message.id || `history-${id}-${index}` }));
        conversationCache.current.set(id, loaded);
        setMessages(loaded);
      }
    } finally {
      if (!controller.signal.aborted) setConversationLoading(false);
    }
  }

  async function renameConversation(id:string) {
    if (!editingTitle.trim()) return;
    await fetch("/api/conversation/rename", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ conversationId:id, title:editingTitle }),
    });
    setEditingId(null);
    setEditingTitle("");
    loadHistory();
  }

  async function deleteConversation(id:string) {
    await fetch("/api/conversation/delete", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ conversationId:id }),
    });
    if (conversationId === id) {
      setMessages([]);
      setConversationId(null);
    }
    loadHistory();
  }

  async function analyzeFile(file:File) {
    setMessages((prev) => [...prev, { id:`file-${Date.now()}-user`, role:"user", content:`Analyze uploaded file: ${file.name}` }]);

    const form = new FormData();
    form.append("file", file);
    form.append("question", "Analyze this like ChatGPT. If it is an image, describe it and give useful insights. If it is a document, summarize it and extract important action items.");

    const res = await fetch("/api/files/analyze", {
      method:"POST",
      body:form,
    });

    const data = await res.json();

    setMessages((prev) => [...prev, {
      id:`file-${Date.now()}-assistant`, role:"assistant",
      content:data.answer || data.error || "I could not analyze this file."
    }]);

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
      loadInstalledCORE();
      setAuthReady(true);
    }

    const savedLanguage = localStorage.getItem("alma_language");
    if (savedLanguage === "en" || savedLanguage === "es") {
      setLanguage(savedLanguage);
    }

    checkOnboarding();
  }, []);

  function Sidebar() {
    const activeBadge = <span className="text-[10px] font-medium text-green-600">{t.active.toUpperCase()}</span>;
    const proBadge = <span className="text-[10px] font-medium text-black">{t.pro.toUpperCase()}</span>;

    const navClass = (key: string) =>
      `flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
        activeWorkspace === key
          ? "bg-gray-200 text-black"
          : "text-[#6B7280] hover:bg-gray-200 hover:text-black"
      }`;

    return (
      <aside className="flex h-full w-72 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:w-64">
        <div className="px-5 pb-4 pt-5">
          <button
            onClick={() => { setActiveWorkspace("chat"); setSidebarOpen(false); }}
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
          <button
            onClick={() => { setStreamEpoch((value) => value + 1); setActiveWorkspace("chat"); setMessages([]); setConversationId(null); setSidebarOpen(false); }}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            <span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-[#6B7280]" />{t.newChat}</span>
            <PenSquare className="h-4 w-4 text-[#6B7280]" />
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input placeholder={t.search} className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-black" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8 text-sm">
          <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.history}</h5>

          {history.map((chat) => (
            <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-gray-200">
              <button onClick={() => loadConversation(chat.id)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[#6B7280] hover:text-black">
                {chat.title || t.newChat}
              </button>
              <button onClick={() => deleteConversation(chat.id)} className="hidden px-1 text-xs text-red-500 group-hover:block">
                Delete
              </button>
            </div>
          ))}

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.core}</h5>

            <button onClick={() => { setActiveWorkspace("apps"); setSidebarOpen(false); }} className={navClass("apps")}><span className="flex items-center gap-2.5"><Home className="h-4 w-4" />{t.home}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("planner"); setSidebarOpen(false); }} className={navClass("planner")}><span className="flex items-center gap-2.5"><Calendar className="h-4 w-4" />{t.planner}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("tasks"); setSidebarOpen(false); }} className={navClass("tasks")}><span className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4" />{t.tasks}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("notes"); setSidebarOpen(false); }} className={navClass("notes")}><span className="flex items-center gap-2.5"><FileText className="h-4 w-4" />{t.notes}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("documents"); setSidebarOpen(false); }} className={navClass("documents")}><span className="flex items-center gap-2.5"><FolderOpen className="h-4 w-4" />{t.documents}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("fitness"); setSidebarOpen(false); }} className={navClass("fitness")}><span className="flex items-center gap-2.5"><Activity className="h-4 w-4" />{t.fitness}</span>{activeBadge}</button>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.business}</h5>

            <button onClick={() => { setActiveWorkspace("crm"); setSidebarOpen(false); }} className={navClass("crm")}><span className="flex items-center gap-2.5"><Users className="h-4 w-4" />{t.crm}</span>{activeBadge}</button>
            <button onClick={() => { setActiveWorkspace("invoicing"); setSidebarOpen(false); }} className={navClass("invoicing")}><span className="flex items-center gap-2.5"><ReceiptText className="h-4 w-4" />{t.invoices}</span>{activeBadge}</button>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.ai}</h5>

            <button onClick={() => { setActiveWorkspace("chat"); setSidebarOpen(false); }} className={navClass("chat")}><span className="flex items-center gap-2.5"><Mic className="h-4 w-4" />{t.alma}</span>{proBadge}</button>
            <button onClick={() => { setActiveWorkspace("images"); setSidebarOpen(false); }} className={navClass("images")}><span className="flex items-center gap-2.5"><ImageIcon className="h-4 w-4" />{t.images}</span>{proBadge}</button>
            <button onClick={() => { setActiveWorkspace("creative"); setSidebarOpen(false); }} className={navClass("creative")}><span className="flex items-center gap-2.5"><Settings className="h-4 w-4" />{t.creativeStudio}</span>{proBadge}</button>
            <button onClick={() => { setActiveWorkspace("launch"); setSidebarOpen(false); }} className={navClass("launch")}><span className="flex items-center gap-2.5"><Rocket className="h-4 w-4" />{t.launchStudio}</span>{proBadge}</button>
            <button onClick={() => { setActiveWorkspace("trader"); setSidebarOpen(false); }} className={navClass("trader")}><span className="flex items-center gap-2.5"><Activity className="h-4 w-4" />{t.trader}</span>{proBadge}</button>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.platform}</h5>

            <button onClick={() => { setActiveWorkspace("marketplace"); setSidebarOpen(false); }} className={activeWorkspace === "marketplace" ? "flex w-full items-center gap-2.5 rounded-lg bg-gray-200 px-2 py-1.5 text-left text-black" : "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black"}><Store className="h-4 w-4" />{t.marketplace}</button>
            <button onClick={() => { setActiveWorkspace("billing"); setSidebarOpen(false); }} className={activeWorkspace === "billing" ? "flex w-full items-center gap-2.5 rounded-lg bg-gray-200 px-2 py-1.5 text-left text-black" : "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black"}><CreditCard className="h-4 w-4" />{t.billing}</button>
            <button onClick={() => { setActiveWorkspace("settings"); setSidebarOpen(false); }} className={activeWorkspace === "settings" ? "flex w-full items-center gap-2.5 rounded-lg bg-gray-200 px-2 py-1.5 text-left text-black" : "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black"}><Settings className="h-4 w-4" />{t.settings}</button>
          </div>
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
      <div className="hidden md:block"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar />
          <button onClick={() => setSidebarOpen(false)} className="flex-1 bg-black/20 backdrop-blur-sm" />
        </div>
      )}

      <section className="relative flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[#F7F7F8]"><Menu className="h-5 w-5" /></button>
          <span className="text-lg font-medium tracking-tight">ALMA</span>
          <button onClick={() => { setStreamEpoch((value) => value + 1); setActiveWorkspace("chat"); setMessages([]); setConversationId(null); }} className="rounded-lg p-2 hover:bg-[#F7F7F8]"><PenSquare className="h-5 w-5" /></button>
        </div>

        {activeWorkspace === "launch" ? (
          <LaunchStudioPanel />
        ) : activeWorkspace === "trader" ? (
          <TraderPanel />
        ) : activeWorkspace === "apps" ? (
          <InlineAppFrame title="Apps" src={`/dashboard/apps?lang=${language}`} />
        ) : activeWorkspace === "planner" ? (
          <InlineAppFrame title="Planner" src={`/planner?lang=${language}`} />
        ) : activeWorkspace === "tasks" ? (
          <InlineAppFrame title="Tasks" src={`/tasks?lang=${language}`} />
        ) : activeWorkspace === "notes" ? (
          <InlineAppFrame title="Notes" src={`/notes?lang=${language}`} />
        ) : activeWorkspace === "documents" ? (
          <InlineAppFrame title="Documents" src={`/documents?lang=${language}`} />
        ) : activeWorkspace === "fitness" ? (
          <InlineAppFrame title="Fitness" src={`/fitness?lang=${language}`} />
        ) : activeWorkspace === "crm" ? (
          <InlineAppFrame title="CRM" src={`/crm?lang=${language}`} />
        ) : activeWorkspace === "invoicing" ? (
          <InlineAppFrame title="Invoices" src={`/invoicing?lang=${language}`} />
        ) : activeWorkspace === "images" ? (
          <InlineAppFrame title="Images" src={`/images?lang=${language}`} />
        ) : activeWorkspace === "creative" ? (
          <InlineAppFrame title="Creative Studio" src={`/creative?lang=${language}`} />
        ) : activeWorkspace === "marketplace" ? (
          <InlineAppFrame title="Marketplace" src={`/marketplace?lang=${language}`} />
        ) : activeWorkspace === "billing" ? (
          <InlineAppFrame title="Billing" src={`/billing?lang=${language}`} />
        ) : activeWorkspace === "settings" ? (
          <InlineAppFrame title="Settings" src={`/settings?lang=${language}`} />
        ) : <ChatWorkspace messages={messages} setMessages={setMessages} conversationId={conversationId} setConversationId={setConversationId} language={language} setLanguage={updateLanguage} streamEpoch={streamEpoch} loadingConversation={conversationLoading} onComplete={() => { void loadHistory(); }} onAnalyzeFile={analyzeFile} />}
      </section>
    </main>
  );
}








































