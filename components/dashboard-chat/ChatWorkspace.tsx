"use client";

import {
  ArrowUp,
  Camera,
  Languages,
  LogIn,
  Mic,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import BilingualComposer from "@/components/communications/BilingualComposer";
import AlmaVoiceControls from "@/components/voice/AlmaVoiceControls";
import {
  CHAT_REQUEST_TIMEOUT_MS,
  createChatSubmissionKey,
  getChatErrorCopy,
  isRecoverableChatError,
  normalizeChatError,
  type ChatErrorCategory,
  type ChatLanguage as SharedChatLanguage,
} from "@/lib/alma/chat/chatErrorHandling";

export type ChatLanguage = SharedChatLanguage;

type ChatTransport = "legacy_stream" | "durable_enqueue" | "durable_poll";

type ChatRetryState = {
  prompt: string;
  responseLanguage: ChatLanguage;
  idempotencyKey: string;
  transport: ChatTransport;
  conversationId: string | null;
  runId?: string;
  executionId?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "error";
  runId?: string;
  executionId?: string;
  createdAt?: string;
  errorCategory?: ChatErrorCategory;
  retry?: ChatRetryState;
};

type Copy = {
  greeting: string;
  identity: string;
  subtitle: string;
  prompt: string;
  disclaimer: string;
  thinking: string;
  chipImage: string;
  chipLogo: string;
  chipAd: string;
  chipCode: string;
  loading: string;
};

const copy: Record<ChatLanguage, Copy> = {
  en: {
    greeting: "Good morning.",
    identity: "I am ALMA.",
    subtitle: "Chat, images, documents, code, and automation in one place.",
    prompt: "Ask ALMA to create, edit, write, or build...",
    disclaimer: "ALMA can make mistakes. Verify important information.",
    thinking: "ALMA is thinking...",
    chipImage: "Create a premium image",
    chipLogo: "Make a logo",
    chipAd: "Generate a 16:9 ad",
    chipCode: "Write code",
    loading: "Loading conversation...",
  },
  es: {
    greeting: "Buenos dias.",
    identity: "Soy ALMA.",
    subtitle:
      "Chat, imagenes, documentos, codigo y automatizacion en un solo lugar.",
    prompt: "Pidele a ALMA crear, editar, escribir o construir...",
    disclaimer: "ALMA puede cometer errores. Verifica informacion importante.",
    thinking: "ALMA esta pensando...",
    chipImage: "Crea una imagen premium",
    chipLogo: "Haz un logo",
    chipAd: "Genera un anuncio 16:9",
    chipCode: "Escribe codigo",
    loading: "Cargando conversacion...",
  },
};

const conversationMarker = /\[CONVERSATION_ID:([^\]]+)\]\n?/g;
const requestedLanguage = (message: string): ChatLanguage | null => {
  const normalized = message.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return /\b(en espanol|spanish)\b/i.test(normalized)
    ? "es"
    : /\b(in english|en ingles)\b/i.test(normalized)
      ? "en"
      : null;
};

function onlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function createTimedController(timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timeoutId),
    timedOut: () => timedOut,
  };
}

function MessageContent({ content }: { content: string }) {
  const image = content.match(/\[ALMA_IMAGE:(.*?)\]/)?.[1];
  if (image) {
    return (
      <img
        src={`data:image/png;base64,${image}`}
        className="max-h-[70vh] w-full rounded-2xl border border-[#E5E7EB] object-contain shadow-sm"
        alt="ALMA generated image"
      />
    );
  }
  const segments = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="min-w-0 break-words whitespace-pre-wrap leading-7">
      {segments.map((segment, index) =>
        segment.startsWith("```") ? (
          <pre
            key={index}
            className="my-3 max-w-full overflow-x-auto rounded-xl bg-neutral-900 p-4 text-sm leading-6 text-neutral-100"
          >
            <code>{segment.slice(3, -3).trim()}</code>
          </pre>
        ) : (
          segment
        ),
      )}
    </div>
  );
}

function ChatErrorCard({
  category,
  language,
  retry,
  onRetry,
}: {
  category: ChatErrorCategory;
  language: ChatLanguage;
  retry?: ChatRetryState;
  onRetry: (retry: ChatRetryState) => void;
}) {
  const text = getChatErrorCopy(category, language);
  const recoverable = retry && isRecoverableChatError(category);
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm shadow-sm"
    >
      <p className="font-medium text-black">{text.title}</p>
      <p className="mt-1 text-[#6B7280]">{text.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recoverable ? (
          <button
            type="button"
            onClick={() => onRetry(retry)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            {text.retryLabel}
          </button>
        ) : null}
        {category === "auth_expired" ? (
          <button
            type="button"
            onClick={() => window.location.assign("/login")}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-black hover:bg-[#F7F7F8]"
          >
            <LogIn className="h-4 w-4" />
            {text.signInLabel}
          </button>
        ) : null}
        {category === "invalid_response" ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-black hover:bg-[#F7F7F8]"
          >
            <RefreshCw className="h-4 w-4" />
            {text.reloadLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  language,
  onRetry,
}: {
  messages: ChatMessage[];
  language: ChatLanguage;
  onRetry: (retry: ChatRetryState) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 md:px-6 md:py-12">
      {messages.length === 0 ? (
        <div className="mt-20 text-center md:mt-28">
          <h1 className="mb-2 text-3xl font-normal tracking-tight md:text-4xl">
            {copy[language].greeting}
          </h1>
          <h2 className="mb-4 text-3xl font-normal tracking-tight md:text-4xl">
            {copy[language].identity}
          </h2>
          <p className="text-lg text-[#6B7280]">{copy[language].subtitle}</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto w-fit max-w-full rounded-2xl bg-black p-3 text-sm text-white md:max-w-[80%] md:p-4"
                : "max-w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-3 text-sm md:max-w-[88%] md:p-4"
            }
          >
            {message.status === "streaming" && !message.content ? (
              <div className="flex items-center gap-2 text-[#6B7280]">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
                {copy[language].thinking}
              </div>
            ) : (
              <>
                {message.content ? (
                  <MessageContent content={message.content} />
                ) : null}
                {message.status === "error" && message.errorCategory ? (
                  <ChatErrorCard
                    category={message.errorCategory}
                    language={language}
                    retry={message.retry}
                    onRetry={onRetry}
                  />
                ) : null}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function ChatSuggestions({
  language,
  onSelect,
}: {
  language: ChatLanguage;
  onSelect: (value: string) => void;
}) {
  const t = copy[language];
  return (
    <div className="mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto px-4 pt-3 md:flex-wrap md:px-6">
      {[t.chipImage, t.chipLogo, t.chipAd, t.chipCode].map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-black"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ChatComposer({
  value,
  language,
  busy,
  onChange,
  onSend,
  onFile,
}: {
  value: string;
  language: ChatLanguage;
  busy: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  return (
    <div className="border-t border-[#E5E7EB] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {composerOpen ? (
          <div className="mb-3">
            <BilingualComposer
              channel="chat"
              initialText={value}
              language={language === "es" ? "es" : "en"}
              onUse={(next) => {
                onChange(next);
                setComposerOpen(false);
              }}
            />
          </div>
        ) : null}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] shadow-sm">
          <textarea
            value={value}
            disabled={busy}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder={copy[language].prompt}
            className="min-h-28 max-h-44 w-full resize-none bg-transparent px-4 pb-14 pt-4 pr-14 text-base leading-6 outline-none placeholder:text-gray-400 disabled:opacity-60"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.docx,.txt,.csv,.xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setComposerOpen((current) => !current)}
              className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"
              aria-label="Open bilingual composer"
            >
              <Languages className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setVoiceOpen((current) => !current)}
              className="rounded-md p-1 text-[#6B7280] hover:bg-gray-200 hover:text-black"
              aria-label="Open ALMA voice"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={busy || !value.trim()}
            className="absolute bottom-3 right-3 rounded-lg bg-black p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
        <p className="pt-2 text-center text-[10px] text-gray-400">
          {copy[language].disclaimer}
        </p>
        {voiceOpen ? (
          <div className="pt-2">
            <AlmaVoiceControls language={language === "es" ? "es" : "en"} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ChatWorkspaceProps = {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  conversationId: string | null;
  setConversationId: (id: string) => void;
  language: ChatLanguage;
  setLanguage: (language: ChatLanguage) => void;
  streamEpoch: number;
  loadingConversation: boolean;
  durableEnabled: boolean;
  initialPrompt?: string;
  onComplete: (conversationId?: string) => void;
  onAnalyzeFile: (file: File) => void;
};

export default function ChatWorkspace({
  messages,
  setMessages,
  conversationId,
  setConversationId,
  language,
  setLanguage,
  streamEpoch,
  loadingConversation,
  durableEnabled,
  initialPrompt = "",
  onComplete,
  onAnalyzeFile,
}: ChatWorkspaceProps) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const pollTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pollControllers = useRef(new Map<string, AbortController>());
  const messageArea = useRef<HTMLDivElement>(null);
  const shouldStick = useRef(true);

  const finishTurn = (completedConversationId?: string | null) => {
    controller.current = null;
    sending.current = false;
    setBusy(false);
    onComplete(completedConversationId ?? conversationId ?? undefined);
  };

  const stopPolling = (runId?: string) => {
    if (runId) {
      const timer = pollTimers.current.get(runId);
      if (timer) clearTimeout(timer);
      pollTimers.current.delete(runId);
      pollControllers.current.get(runId)?.abort();
      pollControllers.current.delete(runId);
      return;
    }
    for (const timer of pollTimers.current.values()) clearTimeout(timer);
    for (const current of pollControllers.current.values()) current.abort();
    pollTimers.current.clear();
    pollControllers.current.clear();
  };

  const markFailed = (
    draftId: string,
    category: ChatErrorCategory,
    retry: ChatRetryState,
    content = "",
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === draftId
          ? {
              ...message,
              content,
              status: "error",
              errorCategory: category,
              retry,
            }
          : message,
      ),
    );
  };

  const markExecutionFailed = (
    executionId: string,
    category: ChatErrorCategory,
    retry: ChatRetryState,
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.executionId === executionId
          ? {
              ...message,
              content: "",
              status: "error",
              errorCategory: category,
              retry,
            }
          : message,
      ),
    );
  };

  const pollRun = async (
    runId: string,
    executionId: string,
    retry: ChatRetryState,
    attempt = 0,
  ) => {
    if (pollControllers.current.has(runId)) return;
    const timed = createTimedController(CHAT_REQUEST_TIMEOUT_MS.durablePoll);
    pollControllers.current.set(runId, timed.controller);
    try {
      const response = await fetch(`/api/chat/runs/${runId}`, {
        signal: timed.controller.signal,
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw Object.assign(new Error("poll"), { status: response.status });
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const category = normalizeChatError({
          context: "durable_poll",
          invalidResponse: true,
          online: onlineState(),
        });
        markExecutionFailed(executionId, category, retry);
        finishTurn(retry.conversationId);
        return;
      }
      const run = await response.json();
      const terminal = ["completed", "failed", "cancelled"].includes(
        run.status,
      );
      setMessages((current) => {
        const existing = current.filter(
          (message) => message.executionId === executionId,
        );
        const remaining = current.filter(
          (message) => message.executionId !== executionId,
        );
        const fallback = existing[0];
        const assistant = run.assistantMessage
          ? {
              id: run.assistantMessage.id,
              role: "assistant" as const,
              content: run.assistantMessage.content ?? "",
              status:
                run.status === "failed"
                  ? ("error" as const)
                  : terminal
                    ? undefined
                    : ("streaming" as const),
              errorCategory:
                run.status === "failed"
                  ? ("durable_worker_failed" as const)
                  : undefined,
              retry: run.status === "failed" ? retry : undefined,
              runId,
              executionId,
              createdAt: run.assistantMessage.created_at ?? run.updated_at,
            }
          : terminal
            ? {
                id: fallback?.id ?? `draft-${executionId}`,
                role: "assistant" as const,
                content: "",
                status: "error" as const,
                errorCategory: "durable_worker_failed" as const,
                retry,
                runId,
                executionId,
                createdAt: fallback?.createdAt,
              }
            : fallback;
        return assistant
          ? [...remaining, assistant].sort((a, b) =>
              String(a.createdAt ?? "").localeCompare(
                String(b.createdAt ?? ""),
              ),
            )
          : remaining;
      });
      if (terminal) {
        stopPolling(runId);
        finishTurn(retry.conversationId);
        return;
      }
      pollTimers.current.set(
        runId,
        setTimeout(() => void pollRun(runId, executionId, retry, 0), 1000),
      );
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : null;
      if (!timed.controller.signal.aborted || timed.timedOut()) {
        if (attempt >= 4) {
          const category = normalizeChatError({
            context: "durable_poll",
            status,
            timedOut: timed.timedOut(),
            online: onlineState(),
          });
          markExecutionFailed(executionId, category, retry);
          finishTurn(retry.conversationId);
        } else {
          pollTimers.current.set(
            runId,
            setTimeout(
              () => void pollRun(runId, executionId, retry, attempt + 1),
              Math.min(5000, 1000 * 2 ** attempt),
            ),
          );
        }
      }
    } finally {
      timed.clear();
      pollControllers.current.delete(runId);
    }
  };

  const submit = async (submission: {
    prompt: string;
    responseLanguage: ChatLanguage;
    idempotencyKey: string;
    draftId: string;
    appendUser: boolean;
    conversationId: string | null;
    transport: Exclude<ChatTransport, "durable_poll">;
  }) => {
    if (sending.current) return;
    if (submission.responseLanguage !== language) {
      setLanguage(submission.responseLanguage);
    }

    let activeConversationId = submission.conversationId;
    const retry: ChatRetryState = {
      prompt: submission.prompt,
      responseLanguage: submission.responseLanguage,
      idempotencyKey: submission.idempotencyKey,
      transport: submission.transport,
      conversationId: activeConversationId,
    };

    sending.current = true;
    setBusy(true);
    if (submission.appendUser) {
      setInput("");
      setMessages((current) => [
        ...current,
        {
          id: `user-${submission.idempotencyKey}`,
          role: "user",
          content: submission.prompt,
        },
        {
          id: submission.draftId,
          role: "assistant",
          content: "",
          status: "streaming",
          retry,
        },
      ]);
    } else {
      setMessages((current) =>
        current.map((message) =>
          message.id === submission.draftId
            ? {
                ...message,
                content: "",
                status: "streaming",
                errorCategory: undefined,
                retry,
              }
            : message,
        ),
      );
    }

    if (!onlineState()) {
      markFailed(
        submission.draftId,
        normalizeChatError({ context: submission.transport, online: false }),
        retry,
      );
      finishTurn(activeConversationId);
      return;
    }

    const timed = createTimedController(
      submission.transport === "durable_enqueue"
        ? CHAT_REQUEST_TIMEOUT_MS.durableEnqueue
        : CHAT_REQUEST_TIMEOUT_MS.legacyStream,
    );
    controller.current = timed.controller;

    try {
      if (submission.transport === "durable_enqueue") {
        const response = await fetch("/api/chat/runs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            message: submission.prompt,
            conversationId: activeConversationId,
            language: submission.responseLanguage,
            idempotencyKey: submission.idempotencyKey,
          }),
          signal: timed.controller.signal,
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          const category = normalizeChatError({
            context: "durable_enqueue",
            status: response.status,
            online: onlineState(),
          });
          markFailed(submission.draftId, category, retry);
          finishTurn(activeConversationId);
          return;
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          markFailed(
            submission.draftId,
            normalizeChatError({
              context: "durable_enqueue",
              invalidResponse: true,
              online: onlineState(),
            }),
            retry,
          );
          finishTurn(activeConversationId);
          return;
        }
        const run = await response.json();
        activeConversationId = run.conversationId;
        setConversationId(run.conversationId);
        const pollRetry: ChatRetryState = {
          ...retry,
          transport: "durable_poll",
          conversationId: run.conversationId,
          runId: run.runId,
          executionId: run.executionId,
        };
        setMessages((current) =>
          current.map((message) =>
            message.id === submission.draftId
              ? {
                  ...message,
                  runId: run.runId,
                  executionId: run.executionId,
                  createdAt: new Date().toISOString(),
                  retry: pollRetry,
                }
              : message,
          ),
        );
        void pollRun(run.runId, run.executionId, pollRetry);
        return;
      }

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
        },
        body: JSON.stringify({
          message: submission.prompt,
          conversationId: activeConversationId,
          language: submission.responseLanguage,
          idempotencyKey: submission.idempotencyKey,
        }),
        signal: timed.controller.signal,
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok || !response.body) {
        const category = normalizeChatError({
          context: "legacy_stream",
          status: response.status,
          invalidResponse: !response.body,
          online: onlineState(),
        });
        markFailed(submission.draftId, category, retry);
        finishTurn(activeConversationId);
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/plain")) {
        markFailed(
          submission.draftId,
          normalizeChatError({
            context: "legacy_stream",
            invalidResponse: true,
            online: onlineState(),
          }),
          retry,
        );
        finishTurn(activeConversationId);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamed = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const match of chunk.matchAll(conversationMarker)) {
          if (match[1]) {
            activeConversationId = match[1];
            setConversationId(match[1]);
          }
        }
        streamed += chunk.replace(conversationMarker, "");
        setMessages((current) =>
          current.map((message) =>
            message.id === submission.draftId
              ? { ...message, content: streamed, status: "streaming" }
              : message,
          ),
        );
      }
      streamed += decoder.decode();
      setMessages((current) =>
        current.map((message) =>
          message.id === submission.draftId
            ? {
                ...message,
                content: streamed,
                status: undefined,
                retry: undefined,
              }
            : message,
        ),
      );
      finishTurn(activeConversationId);
    } catch {
      const category = normalizeChatError({
        context: submission.transport,
        timedOut: timed.timedOut(),
        online: onlineState(),
      });
      markFailed(submission.draftId, category, retry);
      finishTurn(activeConversationId);
    } finally {
      timed.clear();
    }
  };

  const send = () => {
    if (sending.current || !input.trim()) return;
    const prompt = input.trim();
    const responseLanguage = requestedLanguage(prompt) ?? language;
    const idempotencyKey = createChatSubmissionKey();
    void submit({
      prompt,
      responseLanguage,
      idempotencyKey,
      draftId: `assistant-${idempotencyKey}`,
      appendUser: true,
      conversationId,
      transport: durableEnabled ? "durable_enqueue" : "legacy_stream",
    });
  };

  const retryMessage = (retry: ChatRetryState) => {
    if (sending.current) return;
    if (
      retry.transport === "durable_poll" &&
      retry.runId &&
      retry.executionId
    ) {
      sending.current = true;
      setBusy(true);
      setMessages((current) =>
        current.map((message) =>
          message.executionId === retry.executionId
            ? {
                ...message,
                content: "",
                status: "streaming",
                errorCategory: undefined,
                retry,
              }
            : message,
        ),
      );
      void pollRun(retry.runId, retry.executionId, retry);
      return;
    }
    void submit({
      prompt: retry.prompt,
      responseLanguage: retry.responseLanguage,
      idempotencyKey: retry.idempotencyKey,
      draftId: `assistant-${retry.idempotencyKey}`,
      appendUser: false,
      conversationId: retry.conversationId,
      transport:
        retry.transport === "durable_enqueue"
          ? "durable_enqueue"
          : "legacy_stream",
    });
  };

  useEffect(
    () => () => {
      controller.current?.abort();
      stopPolling();
    },
    [],
  );

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    stopPolling();
  }, [streamEpoch, conversationId]);

  useEffect(() => {
    if (shouldStick.current) {
      messageArea.current?.scrollTo({
        top: messageArea.current.scrollHeight,
        behavior: busy ? "auto" : "smooth",
      });
    }
  }, [messages, busy]);

  useEffect(() => {
    if (!durableEnabled) return;
    for (const message of messages) {
      if (
        message.role === "assistant" &&
        message.status === "streaming" &&
        message.runId &&
        message.executionId &&
        message.retry &&
        !pollTimers.current.has(message.runId) &&
        !pollControllers.current.has(message.runId)
      ) {
        void pollRun(message.runId, message.executionId, message.retry);
      }
    }
  }, [messages, durableEnabled]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div
        ref={messageArea}
        onScroll={(event) => {
          const element = event.currentTarget;
          shouldStick.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            96;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {loadingConversation ? (
          <div className="mx-auto flex h-full max-w-3xl items-center px-4 text-sm text-[#6B7280]">
            {copy[language].loading}
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            language={language}
            onRetry={retryMessage}
          />
        )}
      </div>
      {messages.length === 0 && !loadingConversation ? (
        <ChatSuggestions language={language} onSelect={setInput} />
      ) : null}
      <ChatComposer
        value={input}
        language={language}
        busy={busy || loadingConversation}
        onChange={setInput}
        onSend={send}
        onFile={onAnalyzeFile}
      />
    </div>
  );
}
