import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error:"Missing title" }, { status:400 });

  const task = await TaskRepository.create(user.id, body.title);

  return NextResponse.json(task);
}
