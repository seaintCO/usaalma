"use client";

import { useEffect } from "react";

type Lang = "en" | "es";

const pairs: Array<[string, string]> = [
  ["Back to ALMA", "Volver a ALMA"],
  ["New Chat", "Nuevo Chat"],
  ["Search...", "Buscar..."],
  ["History", "Historial"],

  ["Home", "Inicio"],
  ["Planner", "Planificador"],
  ["Tasks", "Tareas"],
  ["Notes", "Notas"],
  ["Documents", "Documentos"],
  ["Business", "Negocio"],
  ["Invoices", "Facturas"],
  ["Billing", "Pagos"],
  ["Settings", "Configuracion"],
  ["Active", "Activo"],

  ["Your Apps", "Tus Apps"],
  ["ALMA is the platform. Apps are the value. AI is the premium layer.", "ALMA es la plataforma. Las apps son el valor. La IA es la capa premium."],
  ["Included with every ALMA account.", "Incluido con cada cuenta de ALMA."],
  ["Premium app. Unlock with subscription.", "App premium. Desbloquea con suscripcion."],
  ["Free", "Gratis"],

  ["Plan your day, organize tasks, and keep your life and business moving.", "Planifica tu dia, organiza tareas y mantiene tu vida y negocio avanzando."],
  ["Today", "Hoy"],
  ["Completed", "Completado"],
  ["High Priority", "Alta Prioridad"],
  ["Daily Focus", "Enfoque Diario"],
  ["Win the top 3 tasks first.", "Gana primero las 3 tareas principales."],
  ["scheduled items", "items programados"],
  ["finished tasks", "tareas terminadas"],
  ["need focus", "requieren enfoque"],
  ["Add to planner", "Agregar al planificador"],
  ["Task, reminder, meeting, or goal", "Tarea, recordatorio, reunion o meta"],
  ["Schedule", "Horario"],
  ["Add task", "Agregar tarea"],
  ["Review business goals", "Revisar metas del negocio"],
  ["Market review", "Revision del mercado"],
  ["Workout", "Entrenamiento"],
  ["All", "Todo"],
  ["Faith", "Fe"],
  ["Family", "Familia"],

  ["Save ideas, meetings, and important context.", "Guarda ideas, reuniones y contexto importante."],
  ["Note title", "Titulo de la nota"],
  ["Write your note...", "Escribe tu nota..."],
  ["New note", "Nueva nota"],

  ["Manage clients, leads, and opportunities.", "Administra clientes, prospectos y oportunidades."],
  ["Name", "Nombre"],
  ["Phone", "Telefono"],
  ["Company", "Empresa"],
  ["New contact", "Nuevo contacto"],
  ["You do not have contacts yet.", "No tienes contactos todavia."],

  ["Food log, goals, meal planning, progress, and AI coaching.", "Registro de comida, metas, plan de comidas, progreso y coach IA."],
  ["Goals", "Metas"],
  ["Calories", "Calorias"],
  ["Protein", "Proteina"],
  ["Carbs", "Carbohidratos"],
  ["Fat", "Grasa"],
  ["Weight goal", "Meta de peso"],
  ["Save goals", "Guardar metas"],
  ["Food Log", "Registro de comida"],
  ["Search USDA food...", "Buscar comida USDA..."],
  ["Food", "Comida"],
  ["Add food", "Agregar comida"],
  ["No food logged today.", "No hay comida registrada hoy."],
  ["Favorites", "Favoritos"],
  ["Meal Planner + AI Coach", "Plan de comidas + Coach IA"],
  ["Generate plan", "Generar plan"],
  ["Generating...", "Generando..."],
  ["Generate a plan based on your goals.", "Genera un plan basado en tus metas."],

  ["Your AI creative director.", "Tu director creativo con IA."],
  ["Upload a product, explain the goal, and ALMA writes the elite prompt for ads, Shopify, Amazon, brand visuals, or social content.", "Sube un producto, explica la meta, y ALMA escribe el prompt elite para anuncios, Shopify, Amazon, visuales de marca o contenido social."],
  ["Upload product image", "Subir imagen del producto"],
  ["Generate image", "Generar imagen"],
  ["Generate with product", "Generar con producto"],
  ["Creating...", "Creando..."],
  ["No assets in this folder yet.", "No hay recursos en esta carpeta todavia."],
];

function getLang(): Lang {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  if (fromUrl === "en" || fromUrl === "es") return fromUrl;

  const saved = window.localStorage.getItem("alma_language");
  if (saved === "en" || saved === "es") return saved;

  return "en";
}

function translateValue(value: string, lang: Lang) {
  let output = value;

  for (const [en, es] of pairs) {
    if (lang === "es") {
      output = output.replaceAll(en, es);
    } else {
      output = output.replaceAll(es, en);
    }
  }

  return output;
}

function translatePage() {
  const lang = getLang();

  document.querySelectorAll("input, textarea").forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (input.placeholder) input.placeholder = translateValue(input.placeholder, lang);
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
    if (!node.nodeValue?.trim()) continue;
    nodes.push(node);
  }

  nodes.forEach((node) => {
    if (!node.nodeValue) return;
    const next = translateValue(node.nodeValue, lang);
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

export default function AlmaAutoTranslate() {
  useEffect(() => {
    translatePage();

    const observer = new MutationObserver(() => {
      translatePage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const interval = window.setInterval(translatePage, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
