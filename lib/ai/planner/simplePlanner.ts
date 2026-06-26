import { AlmaPlan } from "./types";

function detectBusinessName(message:string) {
  const text = message.toLowerCase();

  if (text.includes("roofing")) return "Roofing Company";
  if (text.includes("masonry")) return "Masonry Company";
  if (text.includes("real estate")) return "Real Estate Business";
  if (text.includes("trading")) return "Trading Business";
  if (text.includes("agency")) return "AI Agency";

  return "Nuevo Negocio";
}

function detectBusinessType(message:string) {
  const text = message.toLowerCase();

  if (text.includes("roofing")) return "roofing";
  if (text.includes("masonry")) return "masonry";
  if (text.includes("real estate")) return "real_estate";
  if (text.includes("trading")) return "trading";
  if (text.includes("agency")) return "agency";

  return "business";
}

export function createSimplePlan(message:string):AlmaPlan {
  const text = message.toLowerCase();

  if (
    text.includes("launch") ||
    text.includes("lanzar") ||
    text.includes("empresa") ||
    text.includes("business") ||
    text.includes("company")
  ) {
    const businessName = detectBusinessName(message);
    const businessType = detectBusinessType(message);

    return {
      goal: message,
      steps: [
        {
          tool: "create_workspace",
          label: `Crear workspace: ${businessName}`,
          args: { name: businessName, type: businessType }
        },
        {
          tool: "create_document",
          label: "Crear documento de estrategia inicial",
          args: {
            title: `Estrategia inicial - ${businessName}`,
            content: `Objetivo: ${message}

Oferta:
Define claramente qué vendes, a quién ayudas y por qué deberían elegirte.

Cliente ideal:
Describe el tipo de cliente que más probablemente comprará.

Operaciones:
Define cómo vas a recibir leads, hacer seguimiento, cobrar y entregar el servicio.

Marketing:
Crea contenido, landing page, prueba social y seguimiento.

Primeros 7 días:
1. Definir oferta
2. Crear lista de leads
3. Crear CRM
4. Crear script de ventas
5. Crear primera factura
6. Crear workflow de seguimiento
7. Publicar y vender`
          }
        },
        {
          tool: "create_task",
          label: "Definir oferta principal",
          args: { title: `Definir la oferta principal de ${businessName}` }
        },
        {
          tool: "create_task",
          label: "Crear lista de primeros clientes potenciales",
          args: { title: `Crear lista de primeros clientes potenciales para ${businessName}` }
        },
        {
          tool: "create_note",
          label: "Guardar nota de posicionamiento",
          args: {
            title: `Posicionamiento - ${businessName}`,
            content: `${businessName} debe posicionarse como una solución clara, confiable y rápida para su mercado.`
          }
        },
        {
          tool: "create_workflow",
          label: "Crear workflow de seguimiento de leads",
          args: { name: `Seguimiento de leads - ${businessName}` }
        }
      ]
    };
  }

  return {
    goal: message,
    steps: []
  };
}
