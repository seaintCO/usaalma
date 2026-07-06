"use client";

import { useEffect, useMemo, useState } from "react";

export type AlmaLanguage = "en" | "es";

export const almaDictionary = {
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
    documents: "Documents",
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
} as const;

export function useAlmaLanguage() {
  const [language, setLanguageState] = useState<AlmaLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("alma_language");
    if (saved === "en" || saved === "es") setLanguageState(saved);
  }, []);

  const setLanguage = (next: AlmaLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem("alma_language", next);
    window.dispatchEvent(new CustomEvent("alma-language-change", { detail: next }));
  };

  const t = useMemo(() => almaDictionary[language], [language]);

  return { language, setLanguage, t };
}
