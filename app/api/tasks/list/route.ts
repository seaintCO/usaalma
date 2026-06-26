import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const tasks = await TaskRepository.list(user.id);

  return NextResponse.json(tasks);
}
