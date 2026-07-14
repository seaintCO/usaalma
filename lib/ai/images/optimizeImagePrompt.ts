import OpenAI from "openai";

export async function optimizeImagePrompt(prompt:string) {
  if (!process.env.OPENAI_API_KEY) {
    return prompt;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: (await import("@/lib/ai/models")).OPENAI_MODELS.deep,
    input: `
You are ALMA Creative Director.

Rewrite the user's image idea into a highly detailed image generation prompt.

Rules:
- Keep the user's original intent.
- Add camera, lighting, composition, texture, realism, and style details.
- Make it look premium, realistic, and non-AI.
- Avoid overcomplicated wording.
- Do not include copyrighted characters.
- Do not mention "AI-generated".
- Return only the final optimized prompt.

User idea:
${prompt}
`
  });

  return response.output_text || prompt;
}
