import { NextResponse } from "next/server";
import { agentRoute } from "@/lib/alma/agent-builder/http";
import { clearMemory } from "@/lib/alma/agent-builder/service";

type MemoryContext = { params: Promise<{ agentId: string; memoryId: string }> };

export async function DELETE(_request: Request, context: MemoryContext) {
  return agentRoute(context, async (userId, ctx) => {
    const { agentId, memoryId } = await ctx.params;
    return NextResponse.json(await clearMemory(userId, agentId, memoryId));
  });
}
