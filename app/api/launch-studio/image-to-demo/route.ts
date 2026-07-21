import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { modeConfiguration } from "@/lib/usage/modes";
import { releaseUsage, reserveUsage, settleUsage } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("launch_studio");
  if (error) return error;
  const { image, prompt } = await req.json();

  if (!image)
    return NextResponse.json({ error: "Missing image" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    const demo = await generateLaunchDemo(
      prompt || "Create a futuristic live demo inspired by the uploaded image.",
    );
    return NextResponse.json({ demo });
  }

  const configured = modeConfiguration("pro");
  const usage = await reserveUsage({
    userId: user.id,
    feature: "ai_request",
    mode: "pro",
    model: configured.model,
    units: { requests: 1 },
    idempotencyKey: `launch-image:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
  });
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: configured.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this screenshot/mockup and describe the layout, sections, style, colors, spacing, and UI patterns. Then create a short prompt for ALMA Launch Studio to generate a similar but original futuristic live demo.",
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    const visionPrompt =
      data?.choices?.[0]?.message?.content ||
      prompt ||
      "Create a futuristic live demo from this uploaded reference.";
    const demo = await generateLaunchDemo(visionPrompt);
    await settleUsage(usage, { requests: 1 });

    return NextResponse.json({ demo, visionPrompt });
  } catch (error) {
    await releaseUsage(usage);
    throw error;
  }
}
export const POST = withUsageRoute(post);
