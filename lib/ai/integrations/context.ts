import { IntegrationRepository } from "@/lib/db/repositories/integrations/integration.repository";

export async function buildIntegrationContext(userId:string) {
  const integrations = await IntegrationRepository.listConnected(userId);

  if (!integrations.length) {
    return "Sin integraciones conectadas todavía.";
  }

  return integrations
    .map((item:any) => `- ${item.provider}: conectado`)
    .join("\n");
}
