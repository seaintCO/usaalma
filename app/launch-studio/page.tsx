"use client";

import { Archive, Copy, Download, FileText, Plus, Rocket, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { pick, useAppLanguage } from "@/lib/i18n/appLanguage";

type Project = { id: string; title: string; launch_data: Record<string, string> };
const fields = ["product", "description", "audience", "problem", "solution", "usp", "vision", "mission", "positioning", "pricing", "offer", "competitors", "brandMessaging", "salesAngle", "roadmap", "checklist", "calendar", "socialStrategy", "emailStrategy", "partnershipStrategy", "landingPage", "salesPage", "headline", "cta", "emailSequence", "ads", "tiktokIdeas", "instagramIdeas", "linkedinIdeas"] as const;
const labels: Record<string, [string, string]> = {
  product: ["Product", "Producto"], description: ["Description", "Descripción"], audience: ["Audience", "Audiencia"], problem: ["Problem", "Problema"], solution: ["Solution", "Solución"], usp: ["USP", "Propuesta única"], vision: ["Vision", "Visión"], mission: ["Mission", "Misión"], positioning: ["Positioning", "Posicionamiento"], pricing: ["Pricing", "Precios"], offer: ["Offer", "Oferta"], competitors: ["Competitors", "Competidores"], brandMessaging: ["Brand messaging", "Mensaje de marca"], salesAngle: ["Sales angle", "Ángulo de ventas"], roadmap: ["90-day roadmap", "Ruta de 90 días"], checklist: ["Launch checklist", "Lista de lanzamiento"], calendar: ["Campaign calendar", "Calendario de campaña"], socialStrategy: ["Social strategy", "Estrategia social"], emailStrategy: ["Email strategy", "Estrategia de email"], partnershipStrategy: ["Partnership strategy", "Estrategia de alianzas"], landingPage: ["Landing page", "Landing page"], salesPage: ["Sales page", "Página de ventas"], headline: ["Headline", "Titular"], cta: ["CTA", "CTA"], emailSequence: ["Email sequence", "Secuencia de email"], ads: ["Ads", "Anuncios"], tiktokIdeas: ["TikTok ideas", "Ideas TikTok"], instagramIdeas: ["Instagram ideas", "Ideas Instagram"], linkedinIdeas: ["LinkedIn ideas", "Ideas LinkedIn"]
};
const text = { en: { title: "Launch Studio", subtitle: "Your company launch operating system.", new: "New project", save: "Save", duplicate: "Duplicate", archive: "Archive", delete: "Delete", ask: "Build this launch plan with ALMA", visuals: "Create visuals in Creative Studio", empty: "No launch projects yet.", copy: "Copy", markdown: "Markdown", pdf: "PDF", error: "Project request failed." }, es: { title: "Launch Studio", subtitle: "Tu sistema operativo para lanzar una empresa.", new: "Nuevo proyecto", save: "Guardar", duplicate: "Duplicar", archive: "Archivar", delete: "Eliminar", ask: "Crear este plan con ALMA", visuals: "Crear visuales en Creative Studio", empty: "Aún no hay proyectos.", copy: "Copiar", markdown: "Markdown", pdf: "PDF", error: "La solicitud de proyecto falló." } };
const blank = () => Object.fromEntries(fields.map((field) => [field, ""])) as Record<string, string>;

function toMarkdown(title: string, data: Record<string, string>, language: "en" | "es") {
  return `# ${title}\n\n${fields.map((field) => `## ${labels[field][language === "es" ? 1 : 0]}\n${data[field] || ""}`).join("\n\n")}`;
}

export default function LaunchStudioPage() {
  const language = useAppLanguage();
  const t = pick(language, text.en, text.es);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [data, setData] = useState<Record<string, string>>(blank());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/launch-studio/workspace");
    if (response.ok) setProjects((await response.json()).projects ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    if (!title.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/launch-studio/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: project?.id, title, launchData: data, prompt: data.description }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProject(result.project); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : t.error); } finally { setLoading(false); }
  };

  const select = async (id: string) => {
    const response = await fetch(`/api/launch-studio/workspace/${id}`);
    if (!response.ok) return;
    const next = (await response.json()).project as Project;
    setProject(next); setTitle(next.title); setData({ ...blank(), ...(next.launch_data ?? {}) });
  };
  const reset = () => { setProject(null); setTitle(""); setData(blank()); };
  const content = () => toMarkdown(title, data, language);
  const downloadMarkdown = () => { const blob = new Blob([content()], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${title || "launch-plan"}.md`; link.click(); URL.revokeObjectURL(url); };
  const downloadPdf = async () => { const jsPDF = (await import("jspdf")).default; const doc = new jsPDF(); doc.text(doc.splitTextToSize(content(), 180), 15, 15); doc.save(`${title || "launch-plan"}.pdf`); };
  const askAlma = () => { const prompt = language === "es" ? `Crea un plan de lanzamiento para ${title || "mi empresa"}. ${data.description || ""}` : `Build a launch plan for ${title || "my company"}. ${data.description || ""}`; window.location.href = `/dashboard?prompt=${encodeURIComponent(prompt)}`; };

  return <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-8"><div className="mx-auto max-w-7xl">
    <a href="/dashboard" className="text-sm text-[#6B7280]">← ALMA</a>
    <header className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border bg-white"><Rocket className="h-5 w-5" /></div><h1 className="text-4xl font-medium md:text-5xl">{t.title}</h1><p className="mt-3 text-[#6B7280]">{t.subtitle}</p></div><button onClick={reset} className="rounded-full bg-black px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />{t.new}</button></header>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[260px_1fr]"><aside className="rounded-2xl border bg-white p-4"><h2 className="font-medium">Projects</h2>{projects.length === 0 ? <p className="mt-3 text-sm text-[#6B7280]">{t.empty}</p> : projects.map((item) => <button key={item.id} onClick={() => void select(item.id)} className={`mt-2 block w-full truncate rounded-xl p-3 text-left text-sm ${project?.id === item.id ? "bg-black text-white" : "bg-[#F7F7F8]"}`}>{item.title}</button>)}</aside>
      <section className="rounded-2xl border bg-white p-5"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={language === "es" ? "Nombre de empresa" : "Company name"} className="w-full rounded-xl bg-[#F7F7F8] p-3 text-xl font-medium" /><div className="mt-5 grid gap-4 md:grid-cols-2">{fields.map((field) => <label key={field} className="text-sm font-medium">{labels[field][language === "es" ? 1 : 0]}<textarea value={data[field] || ""} onChange={(event) => setData({ ...data, [field]: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl bg-[#F7F7F8] p-3 text-sm font-normal" /></label>)}</div>
        <div className="mt-6 flex flex-wrap gap-2"><button onClick={() => void save()} disabled={loading || !title.trim()} className="rounded-full bg-black px-4 py-2 text-sm text-white">{t.save}</button><button onClick={askAlma} className="rounded-full border px-4 py-2 text-sm">{t.ask}</button><a href="/creative" className="rounded-full border px-4 py-2 text-sm">{t.visuals}</a>{project && <><button onClick={async () => { const response = await fetch(`/api/launch-studio/workspace/${project.id}/duplicate`, { method: "POST" }); if (response.ok) await select((await response.json()).project.id); }} className="rounded-full border px-4 py-2 text-sm">{t.duplicate}</button><button onClick={async () => { await fetch(`/api/launch-studio/workspace/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive" }) }); reset(); void load(); }} className="rounded-full border px-4 py-2 text-sm"><Archive className="mr-1 inline h-4 w-4" />{t.archive}</button><button onClick={async () => { await fetch(`/api/launch-studio/workspace/${project.id}`, { method: "DELETE" }); reset(); void load(); }} className="rounded-full border px-4 py-2 text-sm text-red-600"><Trash2 className="mr-1 inline h-4 w-4" />{t.delete}</button></>}<button onClick={() => void navigator.clipboard.writeText(content())} className="rounded-full border px-4 py-2 text-sm"><Copy className="mr-1 inline h-4 w-4" />{t.copy}</button><button onClick={downloadMarkdown} className="rounded-full border px-4 py-2 text-sm"><FileText className="mr-1 inline h-4 w-4" />{t.markdown}</button><button onClick={() => void downloadPdf()} className="rounded-full border px-4 py-2 text-sm"><Download className="mr-1 inline h-4 w-4" />{t.pdf}</button></div>
      </section></div>
  </div></main>;
}
