import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({
    ok: true,
    customers: await OfficeRepository.findCustomers(user.id, query),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    return NextResponse.json(
      {
        ok: true,
        customer: await OfficeRepository.createCustomerDraft(user.id, body),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Customer could not be saved." },
      { status: 400 },
    );
  }
}
