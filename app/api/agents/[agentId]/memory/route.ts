import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import { clearMemory, listAgentMemory } from "@/lib/alma/agent-builder/service";

type AgentContext = { params: Promise<{ agentId: string }> };

export async function GET(_request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    return NextResponse.json(await listAgentMemory(userId, agentId));
  });
}

export async function DELETE(request: Request, context: AgentContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId } = await ctx.params;
    const body = await jsonBody(request);
    if (body.confirm !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "confirm_required",
            message: "Confirmation required.",
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(await clearMemory(userId, agentId));
  });
}
