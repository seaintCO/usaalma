import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ContactRepository } from "@/lib/db/repositories/crm/contact.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const contacts = await ContactRepository.list(user.id);

  return NextResponse.json(contacts);
}
