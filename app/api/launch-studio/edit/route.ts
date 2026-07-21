import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("launch_studio");
  if (error) return error;
  const { demo, instruction } = await req.json();

  if (!demo || !instruction) {
    return NextResponse.json(
      { error: "Missing demo or instruction" },
      { status: 400 },
    );
  }

  const prompt = `
Edit this existing live demo based on the instruction.

Instruction:
${instruction}

Existing demo JSON:
${JSON.stringify(demo)}

Return the improved full demo JSON.
`;

  const configured = modeConfiguration("pro");
  const updated = await withUsageReservation(
    {
      userId: user.id,
      feature: "ai_request",
      mode: "pro",
      model: configured.model,
      units: { requests: 1 },
      idempotencyKey: `launch-edit:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
    },
    () => generateLaunchDemo(prompt),
  );
  return NextResponse.json({ demo: { ...demo, ...updated } });
}
export const POST = withUsageRoute(post);
