import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import {
  getAgent,
  setAgentStatus,
  updateAgent,
} from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function GET(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await getAgent(userId, agentId));
  });
}

export async function PATCH(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(
      await updateAgent(userId, agentId, await jsonBody(request)),
    );
  });
}

export async function DELETE(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await setAgentStatus(userId, agentId, "archived"));
  });
}
