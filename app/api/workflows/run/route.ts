import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkflowRunService } from "@/lib/services/workflows/workflowRun.service";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.workflowId) return NextResponse.json({ error:"Missing workflowId" }, { status:400 });

  const run = await WorkflowRunService.run(user.id, body.workflowId);

  return NextResponse.json(run);
}
