import { AlmaPlan } from "./types";

export function createSimplePlan(message:string):AlmaPlan {
  const text = message.toLowerCase();

  if (text.includes("launch") || text.includes("lanzar") || text.includes("empresa") || text.includes("business")) {
    return {
      goal: message,
      steps: [
        {
          tool: "create_workspace",
          label: "Crear workspace del negocio",
          args: { name: "Nuevo Negocio", type: "business" }
        },
        {
          tool: "create_document",
          label: "Crear documento de estrategia inicial",
          args: {
            title: "Estrategia inicial del negocio",
            content: `Objetivo: ${message}\n\nPrimeros pasos: definir oferta, cliente ideal, precios, operaciones, marketing y sistema de seguimiento.`
          }
        },
        {
          tool: "create_task",
          label: "Definir oferta principal",
          args: { title: "Definir la oferta principal del negocio" }
        },
        {
          tool: "create_task",
          label: "Crear lista de primeros clientes potenciales",
          args: { title: "Crear lista de primeros clientes potenciales" }
        },
        {
          tool: "create_workflow",
          label: "Crear workflow de seguimiento de leads",
          args: { name: "Seguimiento de nuevos leads" }
        }
      ]
    };
  }

  return {
    goal: message,
    steps: []
  };
}
