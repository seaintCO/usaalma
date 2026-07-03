"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Sparkles, Wand2 } from "lucide-react";

export default function SitesV2Page() {
  const [form, setForm] = useState<any>({
    name:"",
    industry:"",
    style:"Apple-style, minimal, premium, modern SaaS",
    prompt:"",
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [edit, setEdit] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    const data = await fetch("/api/sites/v2/list").then(r=>r.json());
    if (Array.isArray(data)) setProjects(data);
  }

  useEffect(()=>{ loadProjects(); }, []);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/sites/v2/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not generate.");
    else {
      setActive(data.project);
      loadProjects();
    }
    setLoading(false);
  }

  async function editProject() {
    if (!active || !edit.trim()) return;

    setLoading(true);
    const res = await fetch("/api/sites/v2/edit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ projectId:active.id, instruction:edit }),
    });

    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not edit.");
    else {
      setActive(data.project);
      setEdit("");
      loadProjects();
    }
    setLoading(false);
  }

  async function copyCode() {
    if (!active?.current_code) return;
    await navigator.clipboard.writeText(active.current_code);
    alert("Code copied.");
  }

  function downloadCode() {
    if (!active?.current_code) return;
    const blob = new Blob([active.current_code], { type:"text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name || "alma-site"}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Back to ALMA</a>

        <div className="mt-8">
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">ALMA Sites v2</h1>
          <p className="mt-3 max-w-2xl text-[#6B7280]">
            Aura-style website builder. Generate, preview, edit by chat, copy code, and download. No auto-launch yet.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <h2 className="text-xl font-medium">Generate</h2>
              <div className="mt-4 space-y-3">
                <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Business name" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={form.industry} onChange={e=>setForm({...form, industry:e.target.value})} placeholder="Industry" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <input value={form.style} onChange={e=>setForm({...form, style:e.target.value})} placeholder="Style" className="w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                <textarea value={form.prompt} onChange={e=>setForm({...form, prompt:e.target.value})} placeholder="What should the site say/do?" className="min-h-28 w-full rounded-2xl bg-[#F7F7F8] p-4 outline-none" />
              </div>
              <button onClick={generate} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3 text-white disabled:opacity-50">
                <Sparkles className="h-4 w-4" /> {loading ? "Working..." : "Generate"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
              <h2 className="text-xl font-medium">Projects</h2>
              <div className="mt-4 space-y-2">
                {projects.map(p=>(
                  <button key={p.id} onClick={()=>setActive(p)} className="w-full rounded-2xl bg-[#F7F7F8] p-3 text-left text-sm hover:bg-[#EFEFF1]">
                    <div className="font-medium">{p.name || "Untitled"}</div>
                    <div className="text-xs text-[#6B7280]">{p.industry}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {!active ? (
              <div className="flex min-h-[600px] items-center justify-center rounded-[2rem] border border-[#E5E7EB] bg-white text-[#6B7280]">
                Generate or select a project.
              </div>
            ) : (
              <>
                <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-2xl font-medium">{active.name}</h2>
                      <p className="text-sm text-[#6B7280]">{active.industry}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyCode} className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><Copy className="h-4 w-4" /> Copy</button>
                      <button onClick={downloadCode} className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"><Download className="h-4 w-4" /> Download</button>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <input value={edit} onChange={e=>setEdit(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") editProject(); }} placeholder="Edit by chat: make it darker, add pricing, change hero..." className="flex-1 rounded-2xl bg-[#F7F7F8] px-4 py-3 outline-none" />
                    <button onClick={editProject} className="rounded-2xl bg-black px-5 text-white"><Wand2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5">
                  <h3 className="mb-3 font-medium">Live Preview</h3>
                  <iframe
                    className="h-[650px] w-full rounded-2xl border border-[#E5E7EB] bg-white"
                    srcDoc={`<html><body><pre style="white-space:pre-wrap;font-family:Inter,Arial;padding:24px;">${String(active.current_copy || "").replace(/</g,"&lt;")}</pre></body></html>`}
                  />
                </div>

                <pre className="max-h-[600px] overflow-auto rounded-[2rem] bg-black p-5 text-xs leading-6 text-white">
                  {active.current_code}
                </pre>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
