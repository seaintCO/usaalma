import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import { testAgent } from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function POST(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    const body = await jsonBody(request);
    return NextResponse.json(
      await testAgent(
        userId,
        agentId,
        typeof body.prompt === "string" ? body.prompt : "",
      ),
    );
  });
}
