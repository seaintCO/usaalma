export type AlmaLanguage = "auto" | "en" | "es";

export function detectLanguage(text: string): "en" | "es" {
  const spanishWords =
    /\b(hola|gracias|quiero|necesito|puedes|ayuda|crear|imagen|documento|negocio|factura|contrato|dinero|español)\b/i;
  return spanishWords.test(text) ? "es" : "en";
}

export const t = {
  en: {
    dashboardTitle: "Good morning.",
    dashboardSubtitle:
      "Chat, images, documents, code and automation in one place.",
    askPlaceholder: "Ask ALMA anything...",
    newChat: "New chat",
    modules: "MODULES",
    billing: "Billing",
    creative: "ALMA Nocturai",
    launch: "Launch Studio",
    verify: "Verify important information.",
  },
  es: {
    dashboardTitle: "Buenos días.",
    dashboardSubtitle:
      "Chat, imágenes, documentos, código y automatización en un solo lugar.",
    askPlaceholder: "Pídele a ALMA cualquier cosa...",
    newChat: "Nueva conversación",
    modules: "MÓDULOS",
    billing: "Facturación",
    creative: "ALMA Nocturai",
    launch: "Launch Studio",
    verify: "Verifica información importante.",
  },
};

export function getCopy(lang: AlmaLanguage) {
  if (lang === "es") return t.es;
  return t.en;
}
