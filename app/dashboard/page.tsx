"use client";

import {
  ArrowUp, Calendar, CheckCircle2, CreditCard, FileText, FolderOpen,
  Menu, Mic, Paperclip, PenSquare, PlusCircle, ReceiptText,
  Search, Settings, Store, Users, ImageIcon, Camera, Activity, Rocket, Presentation, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LaunchStudioPanel from "./LaunchStudioPanel";
import TraderPanel from "./TraderPanel";

const moduleMap:any = {
  planner: ["Planner", Calendar, "/planner"],
  tasks: ["Tasks", CheckCircle2, "/tasks"],
  notes: ["Notes", FileText, "/notes"],
  crm: ["CRM", Users, "/crm"],
  invoicing: ["Invoices", ReceiptText, "/invoicing"],
  documents: ["Documentos", FolderOpen, "/documents"],
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

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [installedCORE, setInstalledCORE] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<"chat" | "launch" | "trader">("chat");

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
    const res = await fetch("/api/conversation/load", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ conversationId:id }),
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setMessages(data);
      setConversationId(id);
      setSidebarOpen(false);
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
    setMessages((prev) => [...prev, { role:"user", content:`Analyze uploaded file: ${file.name}` }]);
    setLoading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("question", "Analyze this like ChatGPT. If it is an image, describe it and give useful insights. If it is a document, summarize it and extract important action items.");

    const res = await fetch("/api/files/analyze", {
      method:"POST",
      body:form,
    });

    const data = await res.json();

    setMessages((prev) => [...prev, {
      role:"assistant",
      content:data.answer || data.error || "I could not analyze this file."
    }]);

    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role:"user", content:userMessage }]);
    setLoading(true);
    setMessages((prev) => [...prev, { role:"assistant", content:"ALMA is thinking..." }]);

    const res = await fetch("/api/chat/stream", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ message:userMessage, conversationId }),
    });

    if (!res.body) {
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const match = chunk.match(/\[CONVERSATION_ID:(.*?)\]\n/);
      const cleanChunk = chunk.replace(/\[CONVERSATION_ID:.*?\]\n/, "");

      if (match?.[1]) setConversationId(match[1]);

      fullReply += cleanChunk;

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role:"assistant", content:fullReply };
        return updated;
      });
    }

    setLoading(false);
    loadHistory();
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

    checkOnboarding();
  }, []);

  function Sidebar() {
    return (
      <aside className="flex h-full w-72 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:w-64">
        <a href="/" className="flex h-16 items-center px-5 hover:bg-gray-100">
          <div>
            <div className="text-lg font-medium tracking-tight">ALMA</div>
            <div className="text-[10px] text-[#6B7280]">Powered by SEAINT</div>
          </div>
        </a>

        <div className="px-3">
          <button onClick={() => { setActiveWorkspace("chat"); setMessages([]); setConversationId(null); setSidebarOpen(false); }} className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-[#6B7280]" />Nuevo Chat</span>
            <PenSquare className="h-4 w-4 text-[#6B7280]" />
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input placeholder="Buscar..." className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-black" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-72 md:pb-44 scroll-smooth pb-64 scroll-smooth pb-44 px-3 pb-4 text-sm">
          <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">HISTORIAL</h5>

          {history.map((chat) => (
            <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-gray-200">
              {editingId === chat.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameConversation(chat.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
              ) : (
                <button onClick={() => loadConversation(chat.id)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[#6B7280] hover:text-black">
                  {chat.title || "Nueva conversaciÃƒÂ³n"}
                </button>
              )}

              <button onClick={() => { setEditingId(chat.id); setEditingTitle(chat.title || "Nueva conversaciÃƒÂ³n"); }} className="hidden px-1 text-xs text-[#6B7280] group-hover:block">
                Editar
              </button>
              <button onClick={() => deleteConversation(chat.id)} className="hidden px-1 text-xs text-red-500 group-hover:block">
                Borrar
              </button>
            </div>
          ))}

                    <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">CORE</h5>

            <a href="/dashboard/apps" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Home className="h-4 w-4" />Home</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/planner" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Calendar className="h-4 w-4" />Planner</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/tasks" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4" />Tasks</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/notes" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><FileText className="h-4 w-4" />Notes</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/documents" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><FolderOpen className="h-4 w-4" />Documents</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/fitness" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Activity className="h-4 w-4" />Fitness</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">BUSINESS</h5>

            <a href="/crm" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Users className="h-4 w-4" />CRM</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>

            <a href="/invoicing" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><ReceiptText className="h-4 w-4" />Invoices</span>
              <span className="text-[10px] text-green-600">FREE</span>
            </a>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">AI</h5>

            <button onClick={() => { setActiveWorkspace("chat"); setSidebarOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Mic className="h-4 w-4" />ALMA</span>
              <span className="text-[10px] text-black">PRO</span>
            </button>

            <a href="/images" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><ImageIcon className="h-4 w-4" />Images</span>
              <span className="text-[10px] text-black">PRO</span>
            </a>

            <a href="/creative" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Settings className="h-4 w-4" />Creative Studio</span>
              <span className="text-[10px] text-black">PRO</span>
            </a>

            <button onClick={() => { setActiveWorkspace("launch"); setSidebarOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Rocket className="h-4 w-4" />Launch Studio</span>
              <span className="text-[10px] text-black">PRO</span>
            </button>

            <button onClick={() => { setActiveWorkspace("trader"); setSidebarOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black">
              <span className="flex items-center gap-2.5"><Activity className="h-4 w-4" />Trader</span>
              <span className="text-[10px] text-black">PRO</span>
            </button>
          </div>

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <div className="mb-6 space-y-1">
            <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">PLATFORM</h5>

            <a href="/marketplace" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Store className="h-4 w-4" />Marketplace</a>
            <a href="/billing" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><CreditCard className="h-4 w-4" />Billing</a>
            <a href="/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Settings className="h-4 w-4" />Settings</a>
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
          <div className="mt-2 text-sm text-[#6B7280]">Loading your workspace...</div>
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
          <button onClick={() => { setActiveWorkspace("chat"); setMessages([]); setConversationId(null); }} className="rounded-lg p-2 hover:bg-[#F7F7F8]"><PenSquare className="h-5 w-5" /></button>
        </div>

        {activeWorkspace === "launch" ? (
          <LaunchStudioPanel />
        ) : activeWorkspace === "trader" ? (
          <TraderPanel />
        ) : (
        <>
        <div className="flex-1 overflow-y-auto pb-72 md:pb-44 scroll-smooth pb-64 scroll-smooth pb-44 px-4 pb-44 pt-8 md:px-6 md:pt-16">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="mt-24 text-center md:mt-32">
                <h1 className="mb-2 text-3xl font-normal tracking-tight md:text-4xl">Buenos dias.</h1>
                <h2 className="mb-4 text-3xl font-normal tracking-tight md:text-4xl">Soy ALMA.</h2>
                <p className="text-lg text-[#6B7280]">Chat, imagenes, documentos, codigo y automatizacion en un solo lugar.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, index) => (
                  <div key={index} className={msg.role === "user" ? "ml-auto max-w-[95%] md:max-w-[90%] rounded-2xl bg-black p-3 text-sm md:p-4 text-white md:max-w-[80%]" : "max-w-[95%] md:max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-3 text-sm md:p-4 leading-6 md:max-w-[80%]"}>
                    {renderMessage(msg.content || "")}
                  </div>
                ))}
                {loading && (
<div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm mb-4">
<div className="flex items-center gap-2 text-sm font-medium">
<div className="animate-spin h-4 w-4 rounded-full border-2 border-neutral-300 border-t-black"></div>
<span>ALMA is thinking...</span>
</div>
</div>
) && <div className="max-w-[95%] md:max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-3 text-sm md:p-4 text-[#6B7280] md:max-w-[80%]">ALMA is thinking...</div>}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent px-3 pb-4 pt-10 md:px-4 md:pb-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
              {["Crea una imagen premium", "Haz un logo", "Genera un anuncio 16:9", "Escribe codigo"].map((label) => (
                <button key={label} onClick={() => setInput(label)} className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-black">
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] shadow-sm">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} placeholder="Pidele a ALMA crear, editar, escribir o construir..." className="min-h-[118px] max-h-32 w-full resize-none bg-transparent px-4 pt-4 pb-16 pr-14 text-base leading-6 outline-none placeholder:text-gray-400 sm:min-h-[104px] sm:pb-12" />

              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.docx,.txt,.csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyzeFile(file); }} />
                <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyzeFile(file); }} />
                <button onClick={() => fileInputRef.current?.click()} className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black" title="Upload file"><Paperclip className="h-5 w-5" /></button>
                <button onClick={() => cameraInputRef.current?.click()} className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black" title="Take photo"><Camera className="h-5 w-5" /></button>
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Mic className="h-5 w-5" /></button>
              </div>

              <button onClick={sendMessage} disabled={loading} className="absolute bottom-4 right-4 rounded-lg bg-black p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </div>

            <p className="text-center text-[10px] text-gray-400">ALMA puede cometer errores. Verifica informacion importante.</p>
          </div>
        </div>
        </>
        )}
      </section>
    </main>
  );
}




























