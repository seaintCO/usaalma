import "server-only";

/**
 * Builds the response-language policy used by the chat compatibility route.
 * Explicit dashboard selections are authoritative; automatic mode preserves
 * the pre-existing request-text fallback exactly.
 */
export function buildResponseLanguageInstruction(
  message: string,
  requestedLanguage: unknown,
) {
  if (requestedLanguage === "en") {
    return "Respond only in English. The selected dashboard language is authoritative for this response.";
  }

  if (requestedLanguage === "es") {
    return "Responde solo en español. El idioma seleccionado en el dashboard es obligatorio para esta respuesta.";
  }

  return /\b(en español|español|spanish|traduce|translate)\b/i.test(message)
    ? "Respond in the language explicitly requested by the user."
    : "Match the user's language. If the user naturally uses both English and Spanish, reply bilingually.";
}
