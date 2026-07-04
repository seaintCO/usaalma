import { NextResponse } from "next/server";
import JSZip from "jszip";
import { renderLaunchHtml } from "@/lib/launch-studio/renderHtml";

export async function POST(req:Request) {
  const { demo } = await req.json();

  if (!demo) {
    return NextResponse.json({ error:"Missing demo" }, { status:400 });
  }

  const html = renderLaunchHtml(demo);
  const zip = new JSZip();

  zip.file("index.html", html);
  zip.file("README.md", `# ${demo.title}

Deploy this folder to Vercel.

1. Upload to GitHub
2. Import repo into Vercel
3. Deploy
`);

  const content = await zip.generateAsync({ type:"uint8array" });

  return new NextResponse(content.buffer as ArrayBuffer, {
    status:200,
    headers:{
      "Content-Type":"application/zip",
      "Content-Disposition":`attachment; filename="${demo.slug || "alma-launch-demo"}.zip"`
    }
  });
}


