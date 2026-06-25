"use client";

import {
  ArrowUp,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Mail,
  Menu,
  Mic,
  Paperclip,
  PenSquare,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const modules = [
  ["Planner", Calendar, "/planner"],
  ["Tasks", CheckCircle2, "/tasks"],
  ["Calendar", Calendar, "/planner"],
  ["Notes", FileText, "/notes"],
  ["CRM", Users, "/crm"],
  ["Facturación", ReceiptText, "/invoicing"],
  ["Documentos", FolderOpen, "/documents"],
];

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadHistory() {
    const res = await fetch("/api/conversation/list");
    const data = await res.json();
    if (Array.isArray(data)) setHistory(data);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, conversationId }),
    });

    const data = await res.json();

    if (data.conversationId) {
      setConversationId(data.conversationId);
      loadHistory();
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.reply || data.error || "ALMA no pudo responder." },
    ]);

    setLoading(false);
  }

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
          <button
            onClick={() => {
              setMessages([]);
              setConversationId(null);
              setSidebarOpen(false);
            }}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-[#6B7280]" />
              Nuevo Chat
            </span>
            <PenSquare className="h-4 w-4 text-[#6B7280]" />
          </button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              placeholder="Buscar..."
              className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 text-sm">
          <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">HISTORIAL</h5>
          {history.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setConversationId(chat.id);
                setSidebarOpen(false);
              }}
              className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[#6B7280] hover:bg-gray-200 hover:text-black"
            >
              {chat.title || "Nueva conversación"}
            </button>
          ))}

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <h5 className="mb-2 px-2 text-xs font-medium text-[#6B7280]">MÓDULOS</h5>
          {modules.map(([name, Icon, href]: any) => (
            <a
              key={name}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black"
            >
              <Icon className="h-4 w-4" />
              {name}
            </a>
          ))}

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <a href="/marketplace" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <Store className="h-4 w-4" />
            Marketplace
          </a>
          <a href="/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <Settings className="h-4 w-4" />
            Settings
          </a>
          <a href="/billing" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[#6B7280] hover:bg-gray-200 hover:text-black">
            <CreditCard className="h-4 w-4" />
            Billing
          </a>
        </div>
      </aside>
    );
  }

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-white text-[#111111]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="h-full">
            <Sidebar />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex-1 bg-black/20 backdrop-blur-sm"
            aria-label="Cerrar menú"
          />
        </div>
      )}

      <section className="relative flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[#F7F7F8]">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-medium tracking-tight">ALMA</span>
          <button
            onClick={() => {
              setMessages([]);
              setConversationId(null);
            }}
            className="rounded-lg p-2 hover:bg-[#F7F7F8]"
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-44 pt-8 md:px-6 md:pt-16">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="mt-24 text-center md:mt-32">
                <h1 className="mb-2 text-3xl font-normal tracking-tight md:text-4xl">Buenos días.</h1>
                <h2 className="mb-4 text-3xl font-normal tracking-tight md:text-4xl">Soy ALMA.</h2>
                <p className="text-lg text-[#6B7280]">¿Qué quieres lograr hoy?</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={
                      msg.role === "user"
                        ? "ml-auto max-w-[90%] rounded-2xl bg-[#2563EB] p-4 text-sm text-white md:max-w-[80%]"
                        : "max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm leading-6 md:max-w-[80%]"
                    }
                  >
                    {msg.content}
                  </div>
                ))}
                {loading && (
                  <div className="max-w-[90%] rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm text-[#6B7280] md:max-w-[80%]">
                    ALMA está pensando...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent px-3 pb-4 pt-10 md:px-8 md:pb-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
              {["Planear mi día", "Crear factura", "Agregar tarea", "Construir recepcionista IA"].map((label) => (
                <button
                  key={label}
                  onClick={() => setInput(label)}
                  className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-black"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] shadow-sm">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Pregúntale cualquier cosa..."
                className="max-h-32 w-full resize-none bg-transparent p-4 pb-12 text-base outline-none placeholder:text-gray-400"
              />

              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                  <Paperclip className="h-5 w-5" />
                </button>
                <button className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black">
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              <button onClick={sendMessage} className="absolute bottom-3 right-4 rounded-lg bg-black p-1.5 text-white hover:bg-gray-800">
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400">
              ALMA puede cometer errores. Verifica la información importante.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
