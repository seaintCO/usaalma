import OpenAI from "openai";

export async function optimizeCreativePrompt(input:{
  prompt:string;
  category:string;
  type:string;
}) {
  if (!process.env.OPENAI_API_KEY) return input.prompt;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.ALMA_MODEL || "gpt-5.5",
    input: `
You are ALMA Creative Director.

Rewrite this into a premium generation prompt.

Type: ${input.type}
Category: ${input.category}

Rules:
- Keep the user's exact intent.
- Add camera, lighting, composition, materials, texture, realism, and premium style.
- Make it clean, high-end, realistic, and non-AI looking.
- If it is for ads/social/product, make it commercial-ready.
- Do not mention AI-generated.
- Return only the optimized prompt.

User prompt:
${input.prompt}
`
  });

  return response.output_text || input.prompt;
}
