"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Code2, Download, Eye, Image, Monitor, MousePointer2, Rocket, Save, Send, Smartphone, Trash2 } from "lucide-react";

const templates = [
  ["saas", "SaaS Demo"],
  ["portfolio", "Business Portfolio"],
  ["investor", "Investor Pitch"],
  ["agency", "Agency Proposal"],
  ["luxury", "Luxury Brand"]
];

export default function LaunchStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [website, setWebsite] = useState("");
  const [template, setTemplate] = useState("saas");
  const [theme, setTheme] = useState("startup");
  const [demo, setDemo] = useState<any>(null);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deployUrl, setDeployUrl] = useState("");
const [components, setComponents] = useState<any[]>([]);
const [versions, setVersions] = useState<any[]>([]);
const [score, setScore] = useState<any>(null);

  useEffect(() => {
    loadProjects(); loadComponents();
  }, []);

  async function loadComponents() {
  const res = await fetch("/api/launch-studio/components");
  const data = await res.json();
  setComponents(data.components || []);
}

async function loadVersions(id:string) {
  const res = await fetch(`/api/launch-studio/versions?projectId=${id}`);
  const data = await res.json();
  setVersions(data.versions || []);
}

async function loadProjects() {
    const res = await fetch("/api/launch-studio/list");
    const data = await res.json();
    setProjects(data.projects || []);
  }

  async function generate() {
    setLoading(true);
    setDeployUrl("");

    const res = await fetch("/api/launch-studio/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt, template, theme, website })
    });

    const data = await res.json();
    setDemo(data.demo);
    setProjectId("");
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

  async function imageToDemo(file:File) {
    const reader = new FileReader();

    reader.onload = async () => {
      setLoading(true);

      const res = await fetch("/api/launch-studio/image-to-demo", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ image:reader.result, prompt })
      });

      const data = await res.json();
      setDemo(data.demo);
      setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  async function saveProject() {
    if (!demo) return;

    const res = await fetch("/api/launch-studio/save", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id:projectId || null, demo, prompt, template, theme })
    });

    const data = await res.json();
    if (data.project?.id) {
      setProjectId(data.project.id);

      await fetch("/api/launch-studio/versions", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ projectId:data.project.id, demo, title:demo.title })
      });

      await loadVersions(data.project.id);
    }

    await loadProjects();
  }

  async function deleteProject(id:string) {
    await fetch("/api/launch-studio/delete", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id })
    });
    await loadProjects(); loadComponents();
  }

  function loadProject(p:any) {
    setProjectId(p.id);
    setDemo(p.demo);
    setPrompt(p.prompt || "");
    setTemplate(p.template || "saas");
    loadVersions(p.id);
  }

  async function downloadFromApi(url:string, filename:string) {
    if (!demo) return;

    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ demo })
    });

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  

  function updateSection(index:number, key:string, value:any) {
    if (!demo) return;
    const next = structuredClone(demo);
    next.sections[index][key] = value;
    setDemo(next);
  }

  function updateCard(sectionIndex:number, cardIndex:number, key:string, value:string) {
    const next = structuredClone(demo);
    next.sections[sectionIndex].cards[cardIndex][key] = value;
    setDemo(next);
  }

  function updateRow(sectionIndex:number, rowIndex:number, colIndex:number, value:string) {
    const next = structuredClone(demo);
    next.sections[sectionIndex].rows[rowIndex][colIndex] = value;
    setDemo(next);
  }

  function updateStat(sectionIndex:number, statIndex:number, colIndex:number, value:string) {
    const next = structuredClone(demo);
    next.sections[sectionIndex].stats[statIndex][colIndex] = value;
    setDemo(next);
  }

  function onDropSection(dropIndex:number) {
    if (dragIndex === null || !demo) return;

    const next = structuredClone(demo);
    const [moved] = next.sections.splice(dragIndex, 1);
    next.sections.splice(dropIndex, 0, moved);
    setDemo(next);
    setDragIndex(null);
  }


  function addComponent(component:any) {
    if (!demo) return;
    const next = structuredClone(demo);
    next.sections = [...(next.sections || []), component.component || component];
    setDemo(next);
  }

  function addFreeformCard(sectionIndex:number) {
    if (!demo) return;
    const next = structuredClone(demo);
    if (!next.sections[sectionIndex].cards) next.sections[sectionIndex].cards = [];
    next.sections[sectionIndex].cards.push({ title:"New Block", description:"Edit this freeform block." });
    setDemo(next);
  }
  const generatedCode = useMemo(() => demo ? JSON.stringify(demo, null, 2) : "", [demo]);

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
              <p className="text-xs text-white/40">Aura-level live demo builder</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <span>Prompt</span>
            <span>Edit</span>
            <span>Code</span>
            <span>Export</span>
            <span>Deploy</span>
          </div>

          <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black">
            Paid Feature
          </button>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-5 lg:sticky lg:top-8 lg:h-fit">
            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur-xl">
              <h1 className="text-5xl font-semibold leading-[0.92] tracking-[-0.075em]">
                Prompt to live demo.
              </h1>

              <div className="mt-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {["apple","luxury","fintech","construction","startup","enterprise"].map((id)=>(
                    <button
                      key={id}
                      onClick={()=>setTheme(id)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold capitalize ${
                        theme === id ? "border-cyan-300 bg-cyan-300/20 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/50"
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

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

              <input
                name="website"
                value={website}
                onChange={(e)=>setWebsite(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />
              <textarea value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder="Example: Create a futuristic demo for an AI receptionist company for real estate offices..."
                className="mt-4 h-36 w-full resize-none rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 text-white outline-none placeholder:text-white/30"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={generate}
                  disabled={loading || !prompt.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-5 py-3 font-bold disabled:opacity-40"
                >
                  {loading ? "Working..." : "Generate"}
                  <ArrowRight size={16} />
                </button>

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 font-bold">
                  <Image size={16} />
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e)=>e.target.files?.[0] && imageToDemo(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {demo && (
              <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
                <p className="mb-3 text-sm font-bold text-white/50">Edit with AI</p>
                <textarea
                  value={edit}
                  onChange={(e)=>setEdit(e.target.value)}
                  placeholder="Make it more luxury. Add stronger pricing. Make hero investor-focused."
                  className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm outline-none placeholder:text-white/25"
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
              <p className="mb-3 text-sm font-bold text-white/50">Component Marketplace</p>
              <div className="grid grid-cols-1 gap-2">
                {components.slice(0,8).map((c:any)=>(
                  <button key={c.id || c.name} onClick={()=>addComponent(c)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]">
                    <strong>{c.name}</strong>
                    <p className="text-xs text-white/35">{c.category}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
              <p className="mb-3 text-sm font-bold text-white/50">Version History</p>
              <div className="space-y-2">
                {versions.length === 0 && <p className="text-sm text-white/30">No versions yet.</p>}
                {versions.slice(0,5).map((v:any)=>(
                  <button key={v.id} onClick={()=>setDemo(v.demo)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]">
                    <strong>{v.title || "Version"}</strong>
                    <p className="text-xs text-white/35">{new Date(v.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
              <p className="mb-3 text-sm font-bold text-white/50">Supabase Projects</p>
              <div className="space-y-2">
                {projects.length === 0 && <p className="text-sm text-white/30">No saved demos yet.</p>}
                {projects.slice(0,6).map((p:any)=>(
                  <div key={p.id} className="flex items-center gap-2">
                    <button onClick={()=>loadProject(p)} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm hover:bg-white/[0.08]">
                      <strong>{p.title}</strong>
                      <p className="text-xs text-white/35">{new Date(p.updated_at).toLocaleString()}</p>
                    </button>
                    <button onClick={()=>deleteProject(p.id)} className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-blue-400/20 bg-[#050b18]/90 p-5 shadow-[0_0_90px_rgba(37,99,235,.28)] backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                <Eye size={16} />
                Visual Editor
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setViewport("desktop")} className={`rounded-full px-4 py-2 text-sm font-bold ${viewport === "desktop" ? "bg-white text-black" : "border border-white/10 bg-white/[0.06]"}`}>
                  <Monitor size={16} className="inline" /> Desktop
                </button>
                <button onClick={()=>setViewport("mobile")} className={`rounded-full px-4 py-2 text-sm font-bold ${viewport === "mobile" ? "bg-white text-black" : "border border-white/10 bg-white/[0.06]"}`}>
                  <Smartphone size={16} className="inline" /> Mobile
                </button>
                <button onClick={()=>setCodeOpen(!codeOpen)} disabled={!demo} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold disabled:opacity-40">
                  <Code2 size={16} className="inline" /> Code
                </button>
                <button onClick={saveProject} disabled={!demo} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold disabled:opacity-40">
                  <Save size={16} className="inline" /> Save
                </button>
                <button onClick={()=>downloadFromApi("/api/launch-studio/export", `${demo?.slug || "alma-demo"}.html`)} disabled={!demo} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
                  HTML</button>
                <button onClick={()=>downloadFromApi("/api/launch-studio/react-export", `${demo?.slug || "alma-demo"}.tsx`)} disabled={!demo} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
                  TSX
                </button>
                <button
  onClick={()=>downloadFromApi("/api/launch-studio/next-project", `${demo?.slug || "alma-demo"}-next-project.zip`)}
  disabled={!demo}
  className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold disabled:opacity-40"
>
  Next ZIP
</button>

<a
  href="https://vercel.com/new"
  target="_blank"
  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
>
  Open Vercel
</a>
              </div>
            </div>

            {score && (
              <div className="mb-4 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-purple-200">
                Design score: {score.before} ? {score.after}
              </div>
            )}

            {deployUrl && (
              <a href={deployUrl} target="_blank" className="mb-4 block rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-200">
                Public preview: {typeof window !== "undefined" ? window.location.origin : ""}{deployUrl}
              </a>
            )}

            {codeOpen && (
              <pre className="mb-5 max-h-[360px] overflow-auto rounded-3xl border border-white/10 bg-black p-5 text-xs leading-6 text-cyan-100">
                {generatedCode}
              </pre>
            )}

            <div className={`mx-auto overflow-hidden rounded-3xl border border-white/10 bg-black transition-all ${viewport === "mobile" ? "max-w-[390px]" : "w-full"}`}>
              <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="flex items-center justify-between">
                  <input
                    value={demo?.title || ""}
                    onChange={(e)=>setDemo({ ...demo, title:e.target.value })}
                    placeholder="Your Generated Demo"
                    className="w-full bg-transparent font-bold outline-none"
                  />
                  <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black">Launch</button>
                </div>
              </div>

              {!demo && (
                <div className="p-10 text-center text-white/40">
                  Generate a demo or upload a screenshot to start.
                </div>
              )}

              {demo?.sections?.map((section:any, sectionIndex:number)=>(
                <div
                  key={sectionIndex}
                  draggable
                  onDragStart={()=>setDragIndex(sectionIndex)}
                  onDragOver={(e)=>e.preventDefault()}
                  onDrop={()=>onDropSection(sectionIndex)}
                  className="border-b border-white/5 p-8"
                >
                  <div className="mb-3 flex justify-end">
                    <button onClick={()=>addFreeformCard(sectionIndex)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold">
                      Add Block
                    </button>
                  </div>

                  <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/30">
                    <MousePointer2 size={14} />
                    Drag Section {sectionIndex + 1}: {section.type}
                  </div>

                  {section.eyebrow !== undefined && (
                    <input
                      value={section.eyebrow || ""}
                      onChange={(e)=>updateSection(sectionIndex, "eyebrow", e.target.value)}
                      className="mb-4 w-full bg-transparent text-xs font-bold tracking-[0.25em] text-blue-300 outline-none"
                    />
                  )}

                  {(section.headline !== undefined || section.title !== undefined) && (
                    <input
                      value={section.headline || section.title || ""}
                      onChange={(e)=>updateSection(sectionIndex, section.headline !== undefined ? "headline" : "title", e.target.value)}
                      className="w-full bg-transparent text-4xl font-semibold leading-[0.95] tracking-[-0.06em] outline-none md:text-6xl"
                    />
                  )}

                  {(section.subheadline !== undefined || section.description !== undefined) && (
                    <textarea
                      value={section.subheadline || section.description || ""}
                      onChange={(e)=>updateSection(sectionIndex, section.subheadline !== undefined ? "subheadline" : "description", e.target.value)}
                      className="mt-5 w-full resize-none bg-transparent text-white/50 outline-none"
                    />
                  )}

                  {section.rows && (
                    <div className="mt-8 rounded-3xl border border-blue-400/20 bg-blue-950/20">
                      {section.rows.map((row:any, rowIndex:number)=>(
                        <div key={rowIndex} className="grid grid-cols-4 border-b border-white/5 p-4 text-sm">
                          {row.map((cell:string, colIndex:number)=>(
                            <input
                              key={colIndex}
                              value={cell}
                              onChange={(e)=>updateRow(sectionIndex, rowIndex, colIndex, e.target.value)}
                              className="min-w-0 bg-transparent outline-none"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.cards && (
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                      {section.cards.map((card:any, cardIndex:number)=>(
                        <div key={cardIndex} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                          <input
                            value={card.title || ""}
                            onChange={(e)=>updateCard(sectionIndex, cardIndex, "title", e.target.value)}
                            className="w-full bg-transparent font-bold outline-none"
                          />
                          <textarea
                            value={card.description || ""}
                            onChange={(e)=>updateCard(sectionIndex, cardIndex, "description", e.target.value)}
                            className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-white/50 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {section.stats && (
                    <div className="mt-8 grid gap-4 md:grid-cols-4">
                      {section.stats.map((stat:any, statIndex:number)=>(
                        <div key={statIndex} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <input
                            value={stat[0]}
                            onChange={(e)=>updateStat(sectionIndex, statIndex, 0, e.target.value)}
                            className="w-full bg-transparent text-xs uppercase tracking-widest text-white/40 outline-none"
                          />
                          <input
                            value={stat[1]}
                            onChange={(e)=>updateStat(sectionIndex, statIndex, 1, e.target.value)}
                            className="mt-2 w-full bg-transparent text-2xl font-bold outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}







