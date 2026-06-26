import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ReceptionistRepository } from "@/lib/db/repositories/receptionist/receptionist.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.businessName) {
    return NextResponse.json({ error:"Missing businessName" }, { status:400 });
  }

  const receptionist = await ReceptionistRepository.create(user.id, body);

  return NextResponse.json(receptionist);
}

