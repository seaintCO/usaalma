import { NextResponse } from "next/server";

function esc(v:any) {
  return String(v ?? "").replace(/`/g,"\\`").replace(/\$/g,"\\$");
}

export async function POST(req:Request) {
  const { demo } = await req.json();

  if (!demo) return NextResponse.json({ error:"Missing demo" }, { status:400 });

  const code = `"use client";

const demo = ${JSON.stringify(demo, null, 2)};

export default function GeneratedDemo() {
  const hero = demo.sections?.find((s:any)=>s.type === "hero");
  const table = demo.sections?.find((s:any)=>s.type === "mock_dashboard");
  const features = demo.sections?.find((s:any)=>s.type === "features");
  const stats = demo.sections?.find((s:any)=>s.type === "stats");

  return (
    <main className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="fixed left-1/2 top-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-20 flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-6 py-4 backdrop-blur-2xl">
          <strong>{demo.title}</strong>
          <div className="hidden gap-8 text-sm text-white/55 md:flex">
            {(demo.nav || []).map((n:string)=><span key={n}>{n}</span>)}
          </div>
          <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black">Launch</button>
        </nav>

        <div className="mb-20">
          <p className="mb-4 text-xs font-bold tracking-[0.25em] text-blue-300">{hero?.eyebrow}</p>
          <h1 className="max-w-5xl text-6xl font-semibold leading-[0.9] tracking-[-0.075em] md:text-8xl">{hero?.headline}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">{hero?.subheadline}</p>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/20">
          {(table?.rows || []).map((row:any, i:number)=>(
            <div key={i} className="grid grid-cols-4 border-b border-white/5 p-4 text-sm">
              <strong>{row[0]}</strong>
              <span className="text-white/50">{row[1]}</span>
              <span className="text-blue-300">{row[2]}</span>
              <span className="text-emerald-300">{row[3]}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(features?.cards || []).slice(0,3).map((card:any, i:number)=>(
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <h3 className="font-bold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {(stats?.stats || []).map((stat:any, i:number)=>(
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-widest text-white/40">{stat[0]}</p>
              <p className="mt-2 text-2xl font-bold">{stat[1]}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}`;

  return new NextResponse(code, {
    status:200,
    headers:{
      "Content-Type":"text/plain; charset=utf-8",
      "Content-Disposition":`attachment; filename="${esc(demo.slug || "alma-demo")}.tsx"`
    }
  });
}
