import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const modules = await ModuleRepository.list(user.id);

  return NextResponse.json(modules);
}
