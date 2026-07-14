import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { buildTradingChartPrompt } from "@/lib/ai/trading/chartPrompt";

export async function POST(req:Request) {
  const { error } = await requirePaidUser();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error:"Missing OPENAI_API_KEY" }, { status:500 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const question = String(form.get("question") || "Analyze this chart. Where should I look for calls or puts?");

  if (!file) {
    return NextResponse.json({ error:"Missing chart screenshot." }, { status:400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error:"Please upload a chart screenshot image." }, { status:400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const result:any = await client.responses.create({
    model:(await import("@/lib/ai/models")).OPENAI_MODELS.deep,
    input:[{
      role:"user",
      content:[
        { type:"input_text", text:buildTradingChartPrompt(question) },
        { type:"input_image", image_url:dataUrl, detail:"high" }
      ]
    }]
  });

  return NextResponse.json({
    success:true,
    answer:result.output_text || "No chart analysis available."
  });
}
