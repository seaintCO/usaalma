import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkspaceInviteRepository } from "@/lib/db/repositories/workspaces/workspaceInvite.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.workspaceId || !body.email) {
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  }

  const invite = await WorkspaceInviteRepository.invite(
    body.workspaceId,
    body.email,
    body.role ?? "member"
  );

  return NextResponse.json(invite);
}
