import { NextResponse } from "next/server";
import { agentRoute, jsonBody } from "@/lib/alma/agent-builder/http";
import { createAgent, listAgents } from "@/lib/alma/agent-builder/service";

export async function GET() {
  return agentRoute(null, async (userId) =>
    NextResponse.json(await listAgents(userId)),
  );
}

export async function POST(request: Request) {
  return agentRoute(null, async (userId) =>
    NextResponse.json(await createAgent(userId, await jsonBody(request))),
  );
}
