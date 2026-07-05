import { buildContext } from "@/lib/ai/memory/context";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { buildRelevantDocumentContext } from "@/lib/ai/documents/context";
import { buildWorkspaceContext } from "@/lib/ai/workspaces/context";
import { getAlmaContext } from "@/lib/alma/context";

export async function loadAlmaWorkspace(userId:string, conversationId:string, message:string) {
  const [memoryContext, integrationContext, documentContext, workspaceContext, almaContext] = await Promise.all([
    buildContext(userId),
    buildIntegrationContext(userId),
    buildRelevantDocumentContext(userId, message),
    buildWorkspaceContext(userId),
    getAlmaContext(userId, conversationId),
  ]);

  return {
    memoryContext,
    integrationContext,
    documentContext,
    workspaceContext,
    almaContext,
  };
}
