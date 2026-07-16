import { NextResponse } from "next/server";
import { agentRoute } from "@/lib/alma/agent-builder/http";
import {
  builderOptions,
  listAvailableTools,
  listVerifiedConnections,
} from "@/lib/alma/agent-builder/service";

export async function GET() {
  return agentRoute(null, async (userId) =>
    NextResponse.json({
      ...builderOptions(),
      availableTools: await listAvailableTools(userId),
      verifiedConnections: await listVerifiedConnections(userId),
    }),
  );
}
