import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.title) return NextResponse.json({ error:"Missing title" }, { status:400 });

  const task = await TaskRepository.create(user.id, body.title);

  return NextResponse.json(task);
}

