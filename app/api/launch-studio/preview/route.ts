import { NextResponse } from "next/server";
import { renderLaunchHtml } from "@/lib/launch-studio/renderHtml";

export async function POST(req:Request) {
  const { demo } = await req.json();

  if (!demo) {
    return NextResponse.json({ error:"Missing demo" }, { status:400 });
  }

  const html = renderLaunchHtml(demo);

  return new NextResponse(html, {
    status:200,
    headers:{
      "Content-Type":"text/html; charset=utf-8"
    }
  });
}
