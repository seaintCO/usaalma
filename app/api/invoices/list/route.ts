import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { InvoiceRepository } from "@/lib/db/repositories/invoices/invoice.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const invoices = await InvoiceRepository.list(user.id);

  return NextResponse.json(invoices);
}
