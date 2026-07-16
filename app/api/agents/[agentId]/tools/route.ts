import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import { assignTools, listAgentTools } from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function GET(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await listAgentTools(userId, agentId));
  });
}

export async function PUT(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    const body = await jsonBody(request);
    const tools = Array.isArray(body.tools) ? body.tools : [];
    return NextResponse.json(
      await assignTools(
        userId,
        agentId,
        tools.filter((tool): tool is string => typeof tool === "string"),
      ),
    );
  });
}
