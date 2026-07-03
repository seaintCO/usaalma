import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const workflows = await WorkflowRepository.list(user.id);

  return NextResponse.json(workflows);
}
