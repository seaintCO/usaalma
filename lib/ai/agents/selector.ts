import { ALMA_AGENTS } from "./agents";

export function selectAgent(message:string) {
  const text = message.toLowerCase();

  if (text.includes("tarea") || text.includes("plan") || text.includes("agenda") || text.includes("meta")) {
    return ALMA_AGENTS.find((a) => a.key === "planner")!;
  }

  if (text.includes("cliente") || text.includes("lead") || text.includes("crm") || text.includes("venta")) {
    return ALMA_AGENTS.find((a) => a.key === "sales")!;
  }

  if (text.includes("factura") || text.includes("pago") || text.includes("cobro") || text.includes("dinero")) {
    return ALMA_AGENTS.find((a) => a.key === "finance")!;
  }

  if (text.includes("recepcionista") || text.includes("twilio") || text.includes("elevenlabs") || text.includes("llamada")) {
    return ALMA_AGENTS.find((a) => a.key === "receptionist")!;
  }

  if (text.includes("biblia") || text.includes("dios") || text.includes("cristiano") || text.includes("fe")) {
    return ALMA_AGENTS.find((a) => a.key === "faith")!;
  }

  return ALMA_AGENTS.find((a) => a.key === "general")!;
}
