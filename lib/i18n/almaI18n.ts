export type AlmaLanguage = "auto" | "en" | "es";

export function detectLanguage(text:string):"en" | "es" {
  const spanishWords = /\b(hola|gracias|quiero|necesito|puedes|ayuda|crear|imagen|documento|negocio|factura|contrato|dinero|espa�ol)\b/i;
  return spanishWords.test(text) ? "es" : "en";
}

export const t = {
  en: {
    dashboardTitle:"Good morning.",
    dashboardSubtitle:"Chat, images, documents, code and automation in one place.",
    askPlaceholder:"Ask ALMA anything...",
    newChat:"New chat",
    modules:"MODULES",
    billing:"Billing",
    creative:"ALMA Nocturai",
    launch:"Launch Studio",
    verify:"Verify important information.",
  },
  es: {
    dashboardTitle:"Buenos d�as.",
    dashboardSubtitle:"Chat, im�genes, documentos, c�digo y automatizaci�n en un solo lugar.",
    askPlaceholder:"P�dele a ALMA cualquier cosa...",
    newChat:"Nueva conversaci�n",
    modules:"M�DULOS",
    billing:"Facturaci�n",
    creative:"ALMA Nocturai",
    launch:"Launch Studio",
    verify:"Verifica informaci�n importante.",
  }
};

export function getCopy(lang:AlmaLanguage) {
  if (lang === "es") return t.es;
  return t.en;
}
