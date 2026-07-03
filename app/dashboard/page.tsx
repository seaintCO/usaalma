"use client";

import {
  ArrowUp, Calendar, CheckCircle2, CreditCard, FileText, FolderOpen,
  Menu, Mic, Paperclip, PenSquare, PlusCircle, ReceiptText,
  Search, Settings, Store, Users, ImageIcon, Camera, Activity
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const moduleMap:any = {
  planner: ["Planner", Calendar, "/planner"],
  tasks: ["Tasks", CheckCircle2, "/tasks"],
  notes: ["Notes", FileText, "/notes"],
  crm: ["CRM", Users, "/crm"],
  invoicing: ["Facturación", ReceiptText, "/invoicing"],
  documents: ["Documentos", FolderOpen, "/documents"],
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
          className="w-full rounded-2xl border border-[#E5E7EB] object-cover shadow-sm"
          alt="ALMA generated image"
        />
        <p className="text-[#6B7280]">
          Imagen generada. Puedes pedirme cambios como: “hazlo más realista”, “en 16:9”, “fondo negro”, o “estilo anuncio premium”.
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
  const [installedModules, setInstalledModules] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  async function loadHistory() {
    const res = await fetch("/api/conversation/list");
    const data = await res.json();
    if (Array.isArray(data)) setHistory(data);
  }

  async function loadInstalledModules() {
    const res = await fetch("/api/modules/list");
    const data = await res.json();
    if (Array.isArray(data)) setInstalledModules(data.filter((m:any) => m.installed));
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
    setMessages((prev) => [...prev, { role:"assistant", content:"" }]);

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
      loadInstalledModules();
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
          <button onClick={() => { setMessages([]); setConversationId(null); setSidebarOpen(false); }} className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm">
            <span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-[#6B7280]" />Nuevo Chat</span>
            <PenSquare className="h-4 w-4 text-[#6B7280]" />
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input placeholder="Buscar..." className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-black" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-64 scroll-smooth pb-44 px-3 pb-4 text-sm">
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
                  {chat.title || "Nueva conversación"}
                </button>
              )}

              <button onClick={() => { setEditingId(chat.id); setEditingTitle(chat.title || "Nueva conversación"); }} className="hidden px-1 text-xs text-[#6B7280] group-hover:block">
                Editar
              </button>
              <button onClick={() => deleteConversation(chat.id)} className="hidden px-1 text-xs text-red-500 group-hover:block">
                Borrar
              </button>
            </div>
          ))}

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">MÓDULOS</h5>

          {installedModules.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[#6B7280]">Instala módulos desde Marketplace.</p>
          ) : (
            installedModules.map((module:any) => {
              const item = moduleMap[module.module_key] || [module.name, Store, "/marketplace"];
              const Icon = item[1];
              return (
                <a key={module.module_key} href={item[2]} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                  <Icon className="h-4 w-4" />
                  {item[0]}
                </a>
              );
            })
          )}

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <a href="/fitness" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Activity className="h-4 w-4" />Fitness</a>
          <a href="/finance" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><CreditCard className="h-4 w-4" />Finance</a>
          <a href="/images" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><ImageIcon className="h-4 w-4" />Images</a>
          <a href="/creative" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Settings className="h-4 w-4" />Creative Studio</a>
          <a href="/marketplace" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Store className="h-4 w-4" />Marketplace</a>
          <a href="/billing" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"><CreditCard className="h-4 w-4" />Billing</a>
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
          <button onClick={() => { setMessages([]); setConversationId(null); }} className="rounded-lg p-2 hover:bg-[#F7F7F8]"><PenSquare className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pb-64 scroll-smooth pb-44 px-4 pb-44 pt-8 md:px-6 md:pt-16">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="mt-24 text-center md:mt-32">
                <h1 className="mb-2 text-3xl font-normal tracking-tight md:text-4xl">Buenos días.</h1>
                <h2 className="mb-4 text-3xl font-normal tracking-tight md:text-4xl">Soy ALMA.</h2>
                <p className="text-lg text-[#6B7280]">Chat, imágenes, documentos, código y automatización en un solo lugar.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, index) => (
                  <div key={index} className={msg.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-black p-4 text-sm text-white md:max-w-[80%]" : "max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm leading-6 md:max-w-[80%]"}>
                    {renderMessage(msg.content || "")}
                  </div>
                ))}
                {loading && (
<div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm mb-4">
<div className="flex items-center gap-2 text-sm font-medium">
<div className="animate-spin h-4 w-4 rounded-full border-2 border-neutral-300 border-t-black"></div>
<span>"✨ ALMA is thinking..."</span>
</div>
</div>
) && <div className="max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280] md:max-w-[80%]">? Thinking...</div>}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent px-3 pb-4 pt-10 md:px-8 md:pb-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
              {["Crea una imagen premium", "Haz un logo", "Genera un anuncio 16:9", "Escribe código"].map((label) => (
                <button key={label} onClick={() => setInput(label)} className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-black">
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] shadow-sm">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} placeholder="Pídele a ALMA crear, editar, escribir o construir..." className="max-h-32 w-full resize-none bg-transparent p-4 pb-12 text-base outline-none placeholder:text-gray-400" />

              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.docx,.txt,.csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyzeFile(file); }} />
                <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyzeFile(file); }} />
                <button onClick={() => fileInputRef.current?.click()} className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black" title="Upload file"><Paperclip className="h-5 w-5" /></button>
                <button onClick={() => cameraInputRef.current?.click()} className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black" title="Take photo">??</button>
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"><Mic className="h-5 w-5" /></button>
              </div>

              <button onClick={sendMessage} disabled={loading} className="absolute bottom-3 right-4 rounded-lg bg-black p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </div>

            <p className="text-center text-[10px] text-gray-400">ALMA puede cometer errores. Verifica información importante.</p>
          </div>
        </div>
      </section>
    </main>
  );
}













