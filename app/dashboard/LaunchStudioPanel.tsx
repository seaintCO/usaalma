"use client";

import { useState } from "react";
import { ArrowRight, Download, Eye, Rocket, Save } from "lucide-react";

const themes = ["apple", "luxury", "fintech", "construction", "startup", "enterprise"];
const templates = [
  ["saas", "SaaS Demo"],
  ["portfolio", "Business Portfolio"],
  ["investor", "Investor Pitch"],
  ["agency", "Agency Proposal"],
  ["luxury", "Luxury Brand"],
];

export default function LaunchStudioPanel() {
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState("saas");
  const [theme, setTheme] = useState("apple");
  const [demo, setDemo] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshPreview(nextDemo:any) {
    const res = await fetch("/api/launch-studio/preview", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo:nextDemo }),
    });

    const html = await res.text();
    setPreviewHtml(html);
  }

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);

    const res = await fetch("/api/launch-studio/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt, template, theme, website:"" }),
    });

    const data = await res.json();

    if (data.demo) {
      setDemo(data.demo);
      await refreshPreview(data.demo);
    } else {
      alert(data.error || "Could not generate.");
    }

    setLoading(false);
  }

  async function saveProject() {
    if (!demo) return;

    await fetch("/api/launch-studio/save", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo, prompt, template, theme }),
    });

    alert("Saved.");
  }

  async function downloadFromApi(url:string, filename:string) {
    if (!demo) return;

    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo }),
    });

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white px-4 py-6 md:px-8">
      <div className="mb-5 flex items-center justify-between rounded-3xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight">Launch Studio</h1>
            <p className="text-sm text-[#6B7280]">Build live demos, portfolios, pitch pages, and business shells.</p>
          </div>
        </div>

        <div className="hidden gap-2 md:flex">
          <button onClick={saveProject} disabled={!demo} className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium disabled:opacity-40">
            <Save className="h-4 w-4" /> Save
          </button>
          <button onClick={()=>downloadFromApi("/api/launch-studio/export", `${demo?.slug || "alma-demo"}.html`)} disabled={!demo} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            <Download className="h-4 w-4" /> HTML
          </button>
          <button onClick={()=>downloadFromApi("/api/launch-studio/next-project", `${demo?.slug || "alma-demo"}-next-project.zip`)} disabled={!demo} className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            Next ZIP
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[370px_1fr]">
        <aside className="overflow-y-auto rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#6B7280]">Theme</p>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((id)=>(
              <button key={id} onClick={()=>setTheme(id)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium capitalize ${theme === id ? "border-black bg-black text-white" : "border-[#E5E7EB] bg-[#F7F7F8] text-[#6B7280]"}`}>
                {id}
              </button>
            ))}
          </div>

          <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-widest text-[#6B7280]">Template</p>
          <div className="grid grid-cols-1 gap-2">
            {templates.map(([id, name])=>(
              <button key={id} onClick={()=>setTemplate(id)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${template === id ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]" : "border-[#E5E7EB] bg-[#F7F7F8] text-[#6B7280]"}`}>
                {name}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e)=>setPrompt(e.target.value)}
            placeholder="Example: Create a premium private equity presentation for ALTA with portfolio, thesis, acquisition strategy, and investor CTA..."
            className="mt-6 h-40 w-full resize-none rounded-3xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 text-sm outline-none placeholder:text-[#9CA3AF]"
          />

          <button onClick={generate} disabled={loading || !prompt.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
            {loading ? "Generating..." : "Generate"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </aside>

        <section className="min-h-0 overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#6B7280]">
              <Eye className="h-4 w-4" />
              Live Preview
            </div>
            <a href="https://vercel.com/new" target="_blank" className="rounded-full bg-[#F7F7F8] px-4 py-2 text-sm font-medium text-black">
              Open Vercel
            </a>
          </div>

          {previewHtml ? (
            <iframe srcDoc={previewHtml} className="h-[calc(100vh-230px)] w-full border-0 bg-white" title="Launch Studio Preview" />
          ) : (
            <div className="grid h-[calc(100vh-230px)] place-items-center bg-white px-8 text-center">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-[#9CA3AF]">ALMA Launch Studio</p>
                <h2 className="mt-4 text-4xl font-normal tracking-tight text-black md:text-6xl">
                  Build a premium demo from one prompt.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-[#6B7280]">
                  Generate the shell, preview it here, then export HTML or a full Next.js project for Vercel.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
