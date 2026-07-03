import { NextResponse } from "next/server";
import { ALMA_AGENTS } from "@/lib/ai/agents/agents";

export async function GET() {
  return NextResponse.json(ALMA_AGENTS);
}
