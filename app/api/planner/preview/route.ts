import { NextResponse } from "next/server";
import { createSimplePlan } from "@/lib/ai/planner/simplePlanner";

export async function POST(req:Request) {
  const body = await req.json();
  const message = body.message ?? "";

  return NextResponse.json(createSimplePlan(message));
}
