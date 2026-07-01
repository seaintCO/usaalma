export const translations:any = {
  es: {
    createAccount:"Crear cuenta",
    login:"Iniciar sesión",
    heroTitle:"Tu sistema operativo personal y empresarial.",
    heroSubtitle:"ALMA organiza tu vida, administra tu negocio y conecta todas tus herramientas desde un solo lugar.",
    createMyAlma:"Crear mi ALMA",
    viewPlans:"Ver planes",
    goodMorning:"Buenos días.",
    almaAsk:"Soy ALMA. ¿Qué quieres lograr hoy?",
    chatPlaceholder:"Pídele a ALMA crear, analizar o automatizar...",
    camera:"Cámara",
    upload:"Subir archivo",
  },
  en: {
    createAccount:"Create account",
    login:"Log in",
    heroTitle:"Your personal and business operating system.",
    heroSubtitle:"ALMA organizes your life, manages your business, and connects all your tools from one place.",
    createMyAlma:"Create my ALMA",
    viewPlans:"View plans",
    goodMorning:"Good morning.",
    almaAsk:"I’m ALMA. What do you want to accomplish today?",
    chatPlaceholder:"Ask ALMA to create, analyze, or automate...",
    camera:"Camera",
    upload:"Upload file",
  }
};

export function getLang() {
  if (typeof window === "undefined") return "es";
  return localStorage.getItem("alma_lang") || "es";
}

export function setLang(lang:string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("alma_lang", lang);
  window.dispatchEvent(new Event("alma-language-change"));
}
