import { NextResponse } from "next/server";

export async function POST(req:Request) {
  const { demo } = await req.json();
  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  const figmaJson = {
    name: demo.title || "ALMA Launch Demo",
    type: "ALMA_FIGMA_EXPORT",
    pages: [
      {
        name: "Launch Page",
        frames: (demo.sections || []).map((section:any, index:number)=>({
          name: `${index + 1}. ${section.type}`,
          type: section.type,
          headline: section.headline || section.title || "",
          subheadline: section.subheadline || section.description || "",
          cards: section.cards || [],
          rows: section.rows || [],
          stats: section.stats || [],
          notes: "Import manually into Figma or use this JSON with a future ALMA Figma plugin."
        }))
      }
    ]
  };

  return new NextResponse(JSON.stringify(figmaJson, null, 2), {
    status:200,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Content-Disposition":`attachment; filename="${demo.slug || "alma-demo"}-figma.json"`
    }
  });
}
