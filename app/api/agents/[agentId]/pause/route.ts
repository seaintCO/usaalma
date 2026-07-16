import { NextResponse } from "next/server";
import { agentRoute } from "@/lib/alma/agent-builder/http";
import { setAgentStatus } from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function POST(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await setAgentStatus(userId, agentId, "paused"));
  });
}
