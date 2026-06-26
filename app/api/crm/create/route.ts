import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ContactRepository } from "@/lib/db/repositories/crm/contact.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const contact = await ContactRepository.create(user.id, body);

  return NextResponse.json(contact);
}
