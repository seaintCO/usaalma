import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ReceptionistRepository } from "@/lib/db/repositories/receptionist/receptionist.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const receptionists = await ReceptionistRepository.list(user.id);

  return NextResponse.json(receptionists);
}
