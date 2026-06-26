import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ContactRepository } from "@/lib/db/repositories/crm/contact.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.name) return NextResponse.json({ error:"Missing name" }, { status:400 });

  const contact = await ContactRepository.create(user.id, body);

  return NextResponse.json(contact);
}

