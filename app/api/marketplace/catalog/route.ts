import { getCurrentUser } from "@/lib/auth/user";
import { MarketplaceCatalogService } from "@/lib/platform/marketplace/catalog.service";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthorized", message: "Authentication is required." },
      },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(
      await MarketplaceCatalogService.getForUser(user.id),
    );
  } catch (error) {
    console.error("Marketplace catalog unavailable", {
      error: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "catalog_unavailable",
          message: "Marketplace catalog is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }
}
