import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkspaceRepository } from "@/lib/db/repositories/workspaces/workspace.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const workspace = await WorkspaceRepository.create(user.id, body.name, body.type ?? "business");

  return NextResponse.json(workspace);
}
