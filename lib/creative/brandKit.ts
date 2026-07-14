import OpenAI from "openai";

export async function generateBrandKit(input:{ brandName:string; industry?:string; style?:string }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      brandName:input.brandName,
      tagline:"Premium brand built with ALMA",
      colors:["#111111", "#F5F5F5", "#2563EB"],
      typography:["Inter", "Helvetica", "Sans Serif"],
      guidelines:["Clean", "Premium", "Modern", "Consistent"]
    };
  }

  const client = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model:process.env.ALMA_MODEL || "gpt-4.1",
    text:{
      format:{
        type:"json_schema",
        name:"brand_kit",
        schema:{
          type:"object",
          properties:{
            brandName:{ type:"string" },
            tagline:{ type:"string" },
            colors:{ type:"array", items:{ type:"string" } },
            typography:{ type:"array", items:{ type:"string" } },
            voice:{ type:"string" },
            guidelines:{ type:"array", items:{ type:"string" } },
            logoPrompt:{ type:"string" },
            socialPrompt:{ type:"string" }
          },
          required:["brandName","tagline","colors","typography","voice","guidelines","logoPrompt","socialPrompt"],
          additionalProperties:false
        }
      }
    },
    input:`
Create a premium brand kit.

Brand: ${input.brandName}
Industry: ${input.industry || "business"}
Style: ${input.style || "modern luxury"}

Return JSON only.
`
  });

  return JSON.parse(response.output_text || "{}");
}
