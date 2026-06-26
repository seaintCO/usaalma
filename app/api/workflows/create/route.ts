import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const workflow = await WorkflowRepository.create(user.id, body.name, body.triggerType ?? "manual");

  return NextResponse.json(workflow);
}

