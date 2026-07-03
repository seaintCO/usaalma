import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { WorkspaceRepository } from "@/lib/db/repositories/workspaces/workspace.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const workspace = await WorkspaceRepository.create(user.id, body.name, body.type ?? "business");

  return NextResponse.json(workspace);
}

