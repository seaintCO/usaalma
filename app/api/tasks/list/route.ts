import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { searchParams } = new URL(request.url);
  const tasks = await TaskRepository.list(user.id, { status: (searchParams.get("status") as any) || "all", priority: searchParams.get("priority") as any, query: searchParams.get("q") || undefined });

  return NextResponse.json(tasks);
}
