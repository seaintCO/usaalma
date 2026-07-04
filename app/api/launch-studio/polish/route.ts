import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";

function scoreDemo(demo:any) {
  let score = 60;
  const sections = demo?.sections || [];
  if (sections.length >= 5) score += 10;
  if (sections.some((s:any)=>s.type === "hero")) score += 8;
  if (sections.some((s:any)=>s.type === "mock_dashboard")) score += 8;
  if (sections.some((s:any)=>s.type === "pricing")) score += 5;
  if (sections.some((s:any)=>s.type === "cta")) score += 5;
  if ((demo?.nav || []).length >= 3) score += 4;
  return Math.min(score, 100);
}

export async function POST(req:Request) {
  const { demo } = await req.json();
  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  const beforeScore = scoreDemo(demo);

  const prompt = `
Polish this ALMA Launch Studio demo to make it more premium, futuristic, Aura-level, and investor/client-ready.

Improve:
- headlines
- section order
- visual hierarchy
- metrics
- premium wording
- pricing/CTA if missing
- nav labels

Return full demo JSON only.

Existing demo:
${JSON.stringify(demo)}
`;

  const polished = await generateLaunchDemo(prompt);
  const afterScore = scoreDemo(polished);

  return NextResponse.json({
    demo:{ ...demo, ...polished },
    score:{
      before:beforeScore,
      after:afterScore,
      notes:[
        "Improved structure",
        "Sharper premium copy",
        "Better section flow",
        "Stronger CTA"
      ]
    }
  });
}
