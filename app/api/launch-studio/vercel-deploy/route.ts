import { NextResponse } from "next/server";
import { renderLaunchHtml } from "@/lib/launch-studio/renderHtml";

export async function POST(req:Request) {
  const { demo } = await req.json();

  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  if (!process.env.VERCEL_TOKEN) {
    return NextResponse.json({
      error:"Missing VERCEL_TOKEN. Add it in .env.local to enable one-click deploy."
    }, { status:400 });
  }

  const html = renderLaunchHtml(demo);

  const payload:any = {
    name: demo.slug || "alma-launch-demo",
    files: [
      {
        file:"index.html",
        data: html
      }
    ],
    projectSettings:{
      framework:null
    }
  };

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method:"POST",
    headers:{
      "Authorization":`Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error:data?.error?.message || "Vercel deploy failed", details:data }, { status:500 });
  }

  return NextResponse.json({
    url:data?.url ? `https://${data.url}` : null,
    deployment:data
  });
}
