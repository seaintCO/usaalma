import { NextResponse } from "next/server";
import { generateLaunchDemo } from "@/lib/launch-studio/generateLaunchDemo";

export async function POST(req:Request) {
  const { image, prompt } = await req.json();

  if (!image) return NextResponse.json({ error:"Missing image" }, { status:400 });

  if (!process.env.OPENAI_API_KEY) {
    const demo = await generateLaunchDemo(prompt || "Create a futuristic live demo inspired by the uploaded image.");
    return NextResponse.json({ demo });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
    },
    body:JSON.stringify({
      model: (await import("@/lib/ai/models")).OPENAI_MODELS.vision,
      messages:[
        {
          role:"user",
          content:[
            {
              type:"text",
              text:"Analyze this screenshot/mockup and describe the layout, sections, style, colors, spacing, and UI patterns. Then create a short prompt for ALMA Launch Studio to generate a similar but original futuristic live demo."
            },
            {
              type:"image_url",
              image_url:{ url:image }
            }
          ]
        }
      ]
    })
  });

  const data = await res.json();
  const visionPrompt = data?.choices?.[0]?.message?.content || prompt || "Create a futuristic live demo from this uploaded reference.";
  const demo = await generateLaunchDemo(visionPrompt);

  return NextResponse.json({ demo, visionPrompt });
}
