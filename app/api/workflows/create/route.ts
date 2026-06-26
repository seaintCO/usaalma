import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const workflow = await WorkflowRepository.create(user.id, body.name, body.triggerType ?? "manual");

  return NextResponse.json(workflow);
}
