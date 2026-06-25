import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.moduleKey) {
    return NextResponse.json({ error: "Missing moduleKey" }, { status: 400 });
  }

  const installed = await ModuleRepository.install(user.id, body.moduleKey);

  return NextResponse.json(installed);
}
