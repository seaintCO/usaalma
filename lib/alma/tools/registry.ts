export type AlmaToolName =
  | "creative"
  | "sites"
  | "crm"
  | "email"
  | "calendar"
  | "documents"
  | "receptionist"
  | "fitness"
  | "trading"
  | "chat";

export function chooseTool(plan:any): AlmaToolName {
  if (plan.intent === "image_generation" || plan.intent === "image_followup") return "creative";
  if (/website|site|landing page|aura|web page/i.test(plan?.message || "")) return "sites";
  if (plan.intent === "crm") return "crm";
  if (plan.intent === "email") return "email";
  if (plan.intent === "calendar") return "calendar";
  if (plan.intent === "document") return "documents";
  if (plan.intent === "receptionist") return "receptionist";
  if (plan.intent === "fitness") return "fitness";
  if (plan.intent === "trading") return "trading";
  return "chat";
}
