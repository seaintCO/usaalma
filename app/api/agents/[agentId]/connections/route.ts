import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import {
  assignConnections,
  listAgentConnections,
} from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function GET(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await listAgentConnections(userId, agentId));
  });
}

export async function PUT(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    const body = await jsonBody(request);
    const connections = Array.isArray(body.connections) ? body.connections : [];
    return NextResponse.json(
      await assignConnections(
        userId,
        agentId,
        connections.filter(
          (connection): connection is string => typeof connection === "string",
        ),
      ),
    );
  });
}
