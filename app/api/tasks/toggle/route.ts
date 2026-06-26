import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  const task = await TaskRepository.toggle(user.id, body.id, body.completed);

  return NextResponse.json(task);
}
