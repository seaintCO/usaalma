import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { InvoiceRepository } from "@/lib/db/repositories/invoices/invoice.repository";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  if (!body.clientName) return NextResponse.json({ error:"Missing clientName" }, { status:400 });

  const invoice = await InvoiceRepository.create(user.id, body);

  return NextResponse.json(invoice);
}

