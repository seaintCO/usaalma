import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.workflowId || !body.label) {
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  }

  const workflow = await WorkflowRepository.addStep(user.id, body.workflowId, {
    type: body.type ?? "task",
    label: body.label,
    config: body.config ?? {},
  });

  return NextResponse.json(workflow);
}
