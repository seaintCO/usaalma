import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import { duplicateAgent } from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function POST(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    const body = await jsonBody(request);
    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey
        : crypto.randomUUID();
    return NextResponse.json(
      await duplicateAgent(userId, agentId, idempotencyKey),
    );
  });
}
