import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { PlannerRepository } from "@/lib/db/repositories/planner/planner.repository";

export async function POST(req: Request) {
  const { user, error } = await requirePaidUser("planner");
  if (error) return error;

  const body = await req.json();
  const data = await PlannerRepository.create(user.id, {
    ...body,
    taskDate: body.task_date || new Date().toISOString().slice(0, 10),
    taskTime: body.task_time,
  });
  return NextResponse.json({ success: true, task: data });
}
