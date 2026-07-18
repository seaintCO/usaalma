import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.moduleKey) {
    return NextResponse.json({ error: "Missing moduleKey" }, { status: 400 });
  }

  const access = await EntitlementService.checkModuleAccess(
    user.id,
    body.moduleKey,
  );

  if (!access || access.accessStatus !== "included") {
    return NextResponse.json(
      { error: "This module is not included in your plan." },
      { status: 403 },
    );
  }

  const installKey =
    access.module.installKey ??
    access.module.entitlementKey ??
    access.module.key;
  const installed = await ModuleRepository.install(user.id, installKey);

  return NextResponse.json(installed);
}
