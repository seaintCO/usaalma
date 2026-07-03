import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error:"Missing OPENAI_API_KEY" }, { status:400 });
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model:process.env.ALMA_TEXT_MODEL || "gpt-4.1-mini",
    response_format:{ type:"json_object" },
    messages:[
      {
        role:"system",
        content:"You are ALMA Sites, an Aura-style AI website builder. Return JSON only with name, current_copy, current_code, and pages. current_code must be a complete React component using Tailwind classes. No markdown."
      },
      {
        role:"user",
        content:`Build a premium website.

Business: ${body.name}
Industry: ${body.industry}
Style: ${body.style}
Instructions: ${body.prompt}

Include:
- Hero
- Services
- Process
- Testimonials
- FAQ
- CTA
- Mobile responsive layout
- Premium SaaS/Apple style`
      }
    ]
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

  const supabase = await createClient();

  const { data, error:dbError } = await supabase.from("alma_site_projects").insert({
    user_id:user.id,
    name:parsed.name || body.name,
    industry:body.industry,
    style:body.style,
    pages:parsed.pages || [],
    current_copy:parsed.current_copy || "",
    current_code:parsed.current_code || "",
  }).select().single();

  if (dbError) return NextResponse.json({ error:dbError.message }, { status:400 });

  return NextResponse.json({ success:true, project:data });
}
