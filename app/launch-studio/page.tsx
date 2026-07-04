"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Code2, Download, MonitorPlay, Rocket, Save, Send, Sparkles } from "lucide-react";

const templates = [
  ["saas", "SaaS Demo"],
  ["portfolio", "Business Portfolio"],
  ["investor", "Investor Pitch"],
  ["agency", "Agency Proposal"],
  ["luxury", "Luxury Brand"]
];

export default function LaunchStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState("saas");
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const local = localStorage.getItem("alma_launch_projects");
    if (local) setSaved(JSON.parse(local));

    fetch("/api/billing/required")
      .then(r=>r.json())
      .then(d=>setLocked(Boolean(d?.required)))
      .catch(()=>setLocked(false));
  }, []);

  async function generate() {
    if (locked) {
      window.location.href = "/billing";
      return;
    }

    setLoading(true);

    const res = await fetch("/api/launch-studio/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt, template })
    });

    const data = await res.json();
    setDemo(data.demo);
    setLoading(false);
  }

  async function editDemo() {
    if (!demo || !edit.trim()) return;

    setLoading(true);

    const res = await fetch("/api/launch-studio/edit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo, instruction:edit })
    });

    const data = await res.json();
    setDemo(data.demo);
    setEdit("");
    setLoading(false);
  }

  async function exportHtml() {
    if (!demo) return;

    const res = await fetch("/api/launch-studio/export", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${demo.slug || "alma-demo"}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function exportProject() {
    if (!demo) return;

    const res = await fetch("/api/launch-studio/project", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${demo.slug || "alma-demo"}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function saveProject() {
    if (!demo) return;

    const next = [
      { id:crypto.randomUUID(), title:demo.title, createdAt:new Date().toISOString(), demo },
      ...saved
    ];

    setSaved(next);
    localStorage.setItem("alma_launch_projects", JSON.stringify(next));
  }

  function loadProject(item:any) {
    setDemo(item.demo);
  }

  const generatedCode = useMemo(() => {
    if (!demo) return "";
    return JSON.stringify(demo, null, 2);
  }, [demo]);

  const hero = demo?.sections?.find((s:any)=>s.type === "hero");
  const table = demo?.sections?.find((s:any)=>s.type === "mock_dashboard");
  const features = demo?.sections?.find((s:any)=>s.type === "features");
  const stats = demo?.sections?.find((s:any)=>s.type === "stats");
  const pricing = demo?.sections?.find((s:any)=>s.type === "pricing");

  return (
    <main className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="fixed left-1/2 top-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[140px]" />

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-8 flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-6 py-4 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Rocket size={20} />
            </div>
            <div>
              <p className="font-bold tracking-tight">ALMA Launch Studio</p>
              <p className="text-xs text-white/40">Full Aura-style builder</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <span>Prompt</span>
            <span>Preview</span>
            <span>Code</span>
            <span>Export</span>
            <span>Vercel</span>
          </div>

          <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black">
            Paid Feature
          </button>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-5 lg:sticky lg:top-8 lg:h-fit">
            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                <Sparkles size={16} />
                Prompt to live demo
              </div>

              <h1 className="text-5xl font-semibold leading-[0.92] tracking-[-0.075em]">
                Build the shell before the product exists.
              </h1>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {templates.map(([id, name])=>(
                  <button
                    key={id}
                    onClick={()=>setTemplate(id)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                      template === id ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/[0.04] text-white/50"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <textarea
                value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder="Example: Create a futuristic demo for an AI receptionist company for real estate offices..."
                className="mt-4 h-40 w-full resize-none rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 text-white outline-none placeholder:text-white/30"
              />

              <button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-3 font-bold shadow-[0_0_45px_rgba(59,130,246,.45)] transition hover:scale-[1.02] disabled:opacity-40"
              >
                {loading ? "Generating..." : locked ? "Upgrade to Unlock" : "Generate Demo"}
                <ArrowRight size={18} />
              </button>
            </div>

            {demo && (
              <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
                <p className="mb-3 text-sm font-bold text-white/50">AI Edit Prompt</p>
                <textarea
                  value={edit}
                  onChange={(e)=>setEdit(e.target.value)}
                  placeholder="Example: Make it more luxury, add pricing, make the hero more investor-focused..."
                  className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm outline-none placeholder:text-white/25"
                />
                <button
                  onClick={editDemo}
                  disabled={loading || !edit.trim()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 font-bold text-black disabled:opacity-40"
                >
                  Edit with AI
                  <Send size={16} />
                </button>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
              <p className="mb-3 text-sm font-bold text-white/50">Saved Projects</p>
              <div className="space-y-2">
                {saved.length === 0 && <p className="text-sm text-white/30">No saved demos yet.</p>}
                {saved.slice(0,5).map((item:any)=>(
                  <button
                    key={item.id}
                    onClick={()=>loadProject(item)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]"
                  >
                    <strong>{item.title}</strong>
                    <p className="text-xs text-white/35">{new Date(item.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-blue-400/20 bg-[#050b18]/90 p-5 shadow-[0_0_90px_rgba(37,99,235,.28)] backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                <MonitorPlay size={16} />
                LIVE DEMO PREVIEW
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setCodeOpen(!codeOpen)} disabled={!demo} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold disabled:opacity-40">
                  <Code2 size={16} /> Code View
                </button>
                <button onClick={saveProject} disabled={!demo} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold disabled:opacity-40">
                  <Save size={16} /> Save
                </button>
                <button onClick={exportHtml} disabled={!demo} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
                  <Download size={16} /> index.html
                </button>
                <button onClick={exportProject} disabled={!demo} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-bold disabled:opacity-40">
                  <Rocket size={16} /> Vercel ZIP
                </button>
              </div>
            </div>

            {codeOpen && (
              <pre className="mb-5 max-h-[360px] overflow-auto rounded-3xl border border-white/10 bg-black p-5 text-xs leading-6 text-cyan-100">
                {generatedCode}
              </pre>
            )}

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="flex items-center justify-between">
                  <strong>{demo?.title || "Your Generated Demo"}</strong>
                  <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black">Launch</button>
                </div>
              </div>

              <div className="p-8">
                <p className="mb-4 text-xs font-bold tracking-[0.25em] text-blue-300">
                  {hero?.eyebrow || "AI GENERATED LIVE DEMO"}
                </p>

                <h2 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-6xl">
                  {hero?.headline || "Your premium demo appears here."}
                </h2>

                <p className="mt-5 max-w-xl text-white/50">
                  {hero?.subheadline || "Write a prompt and ALMA will turn it into a futuristic pitch-ready experience."}
                </p>

                <div className="mt-8 flex gap-4">
                  <button className="rounded-full bg-blue-500 px-6 py-3 font-bold">Launch Demo</button>
                  <button className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold">View Mockup</button>
                </div>

                <div className="mt-12 rounded-3xl border border-blue-400/20 bg-blue-950/20">
                  <div className="flex justify-between border-b border-white/10 p-4 text-xs font-bold tracking-widest text-white/40">
                    <span>{table?.title || "Live Product Preview"}</span>
                    <span className="text-cyan-300">ONLINE</span>
                  </div>

                  {(table?.rows || [
                    ["ALMA OS", "AI Platform", "Active", "+42%"],
                    ["Launch Studio", "Demo Builder", "Beta", "+88%"],
                    ["CRM Memory", "Business Data", "Live", "+21%"],
                    ["Vercel Export", "Static HTML", "Ready", "+100%"]
                  ]).map((row:any, i:number)=>(
                    <div key={i} className="grid grid-cols-4 border-b border-white/5 p-4 text-sm">
                      <strong>{row[0]}</strong>
                      <span className="text-white/50">{row[1]}</span>
                      <span className="text-blue-300">{row[2]}</span>
                      <span className="text-emerald-300">{row[3]}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {(features?.cards || [
                    { title:"Demo Shells", description:"Create a premium product illusion before the product exists." },
                    { title:"Business Portfolios", description:"Generate polished company profiles for clients." },
                    { title:"Investor Pages", description:"Turn ideas into pitch-ready narratives." }
                  ]).slice(0,3).map((card:any, i:number)=>(
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                      <h3 className="font-bold">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/50">{card.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {(stats?.stats || [
                    ["Build Time", "3 min"],
                    ["Export", "index.html"],
                    ["Design", "React Style"],
                    ["Deploy", "Vercel Ready"]
                  ]).map((stat:any, i:number)=>(
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-widest text-white/40">{stat[0]}</p>
                      <p className="mt-2 text-2xl font-bold">{stat[1]}</p>
                    </div>
                  ))}
                </div>

                {pricing?.plans && (
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {pricing.plans.slice(0,3).map((plan:any, i:number)=>(
                      <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                        <p className="font-bold">{plan.name}</p>
                        <p className="mt-2 text-3xl font-black text-blue-300">{plan.price}</p>
                        <p className="mt-3 text-sm leading-6 text-white/50">{plan.features?.join("  ")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
