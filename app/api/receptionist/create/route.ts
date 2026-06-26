import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ReceptionistRepository } from "@/lib/db/repositories/receptionist/receptionist.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.businessName) {
    return NextResponse.json({ error:"Missing businessName" }, { status:400 });
  }

  const receptionist = await ReceptionistRepository.create(user.id, body);

  return NextResponse.json(receptionist);
}
