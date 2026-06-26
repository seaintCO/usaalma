import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { InvoiceRepository } from "@/lib/db/repositories/invoices/invoice.repository";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.clientName) return NextResponse.json({ error:"Missing clientName" }, { status:400 });

  const invoice = await InvoiceRepository.create(user.id, body);

  return NextResponse.json(invoice);
}
