export type ChatLanguage = "en" | "es";

export type ChatErrorCategory =
  | "offline"
  | "auth_expired"
  | "timeout"
  | "server_unavailable"
  | "rate_limited"
  | "durable_enqueue_failed"
  | "durable_worker_failed"
  | "invalid_response"
  | "unknown";

export type ChatFailureContext =
  "legacy_stream" | "durable_enqueue" | "durable_poll" | "durable_worker";

export const CHAT_REQUEST_TIMEOUT_MS = {
  legacyStream: 90_000,
  durableEnqueue: 20_000,
  durablePoll: 12_000,
} as const;

export type ChatErrorInput = {
  context: ChatFailureContext;
  status?: number | null;
  online?: boolean;
  timedOut?: boolean;
  invalidResponse?: boolean;
  workerFailed?: boolean;
};

export type ChatErrorCopy = {
  title: string;
  message: string;
  retryLabel: string;
  signInLabel: string;
  reloadLabel: string;
};

export function normalizeChatError(input: ChatErrorInput): ChatErrorCategory {
  if (input.online === false) return "offline";
  if (input.status === 401 || input.status === 403) return "auth_expired";
  if (input.timedOut) return "timeout";
  if (input.status === 429) return "rate_limited";
  if (input.workerFailed || input.context === "durable_worker") {
    return "durable_worker_failed";
  }
  if (input.invalidResponse || input.status === 400 || input.status === 404) {
    return "invalid_response";
  }
  if (input.context === "durable_enqueue") {
    return "durable_enqueue_failed";
  }
  if (input.status && input.status >= 500) return "server_unavailable";
  if (input.context === "durable_poll") return "server_unavailable";
  return "unknown";
}

export function getChatErrorCopy(
  category: ChatErrorCategory,
  language: ChatLanguage,
): ChatErrorCopy {
  const shared =
    language === "es"
      ? {
          retryLabel: "Reintentar",
          signInLabel: "Iniciar sesion",
          reloadLabel: "Recargar",
        }
      : {
          retryLabel: "Retry",
          signInLabel: "Sign in",
          reloadLabel: "Reload",
        };

  const catalog: Record<
    ChatErrorCategory,
    Record<ChatLanguage, Omit<ChatErrorCopy, keyof typeof shared>>
  > = {
    offline: {
      en: {
        title: "You appear to be offline.",
        message: "ALMA kept your message. Reconnect, then retry.",
      },
      es: {
        title: "Parece que no tienes conexion.",
        message: "ALMA conservo tu mensaje. Vuelve a conectarte y reintenta.",
      },
    },
    auth_expired: {
      en: {
        title: "Sign in required.",
        message: "Your session expired. Sign in again to continue this chat.",
      },
      es: {
        title: "Debes iniciar sesion.",
        message: "Tu sesion expiro. Inicia sesion otra vez para continuar.",
      },
    },
    timeout: {
      en: {
        title: "The request timed out.",
        message: "ALMA kept your message. Retry when the connection is stable.",
      },
      es: {
        title: "La solicitud tardo demasiado.",
        message:
          "ALMA conservo tu mensaje. Reintenta con una conexion estable.",
      },
    },
    server_unavailable: {
      en: {
        title: "ALMA is temporarily unavailable.",
        message: "The service did not respond reliably. Please retry.",
      },
      es: {
        title: "ALMA no esta disponible temporalmente.",
        message: "El servicio no respondio de forma confiable. Reintenta.",
      },
    },
    rate_limited: {
      en: {
        title: "Too many requests.",
        message: "ALMA is being rate limited. Wait a moment, then retry.",
      },
      es: {
        title: "Demasiadas solicitudes.",
        message:
          "ALMA esta limitada por volumen. Espera un momento y reintenta.",
      },
    },
    durable_enqueue_failed: {
      en: {
        title: "ALMA could not queue the run.",
        message:
          "Your message is preserved. Retry will reuse the same request identity.",
      },
      es: {
        title: "ALMA no pudo poner la ejecucion en cola.",
        message: "Tu mensaje se conservo. Reintentar usara la misma identidad.",
      },
    },
    durable_worker_failed: {
      en: {
        title: "ALMA could not complete the background run.",
        message:
          "The run ended before producing a response. Retry safely from here.",
      },
      es: {
        title: "ALMA no pudo completar la ejecucion en segundo plano.",
        message: "La ejecucion termino sin respuesta. Puedes reintentar aqui.",
      },
    },
    invalid_response: {
      en: {
        title: "ALMA received an unexpected response.",
        message: "The server response was not usable. Please retry.",
      },
      es: {
        title: "ALMA recibio una respuesta inesperada.",
        message: "La respuesta del servidor no se pudo usar. Reintenta.",
      },
    },
    unknown: {
      en: {
        title: "ALMA could not finish the response.",
        message: "Your message is preserved. Please retry.",
      },
      es: {
        title: "ALMA no pudo terminar la respuesta.",
        message: "Tu mensaje se conservo. Reintenta.",
      },
    },
  };

  return { ...catalog[category][language], ...shared };
}

export function isRecoverableChatError(category: ChatErrorCategory) {
  return category !== "auth_expired";
}

export function createChatSubmissionKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
