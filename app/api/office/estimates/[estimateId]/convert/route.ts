import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ estimateId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { estimateId } = await context.params;
    return NextResponse.json({
      ok: true,
      invoiceId: await OfficeRepository.convertEstimateToInvoice(
        user.id,
        estimateId,
      ),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Estimate could not be converted." },
      { status: 400 },
    );
  }
}
