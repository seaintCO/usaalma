"use client";

import { ArrowLeft, Download, ImageIcon, Megaphone, Package, Palette, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

const useCases = [
  { key:"shopify_product", label:"Shopify Product Photos", group:"Product", icon:Package },
  { key:"amazon_listing", label:"Amazon Listing", group:"Product", icon:Package },
  { key:"white_background", label:"White Background", group:"Product", icon:Package },
  { key:"lifestyle_ad", label:"Lifestyle Ad", group:"Ads", icon:Megaphone },
  { key:"instagram_ad", label:"Instagram Ad", group:"Ads", icon:Megaphone },
  { key:"facebook_ad", label:"Facebook Ad", group:"Ads", icon:Megaphone },
  { key:"luxury_website", label:"Luxury Website Hero", group:"Website", icon:ImageIcon },
  { key:"brand_kit", label:"Brand Kit Direction", group:"Brand", icon:Palette },
  { key:"logo", label:"Logo Concepts", group:"Brand", icon:Palette },
  { key:"replace_background", label:"Replace Background", group:"Editing", icon:Wand2 },
  { key:"relighting", label:"Relighting", group:"Editing", icon:Wand2 },
  { key:"object_removal", label:"Object Removal", group:"Editing", icon:Wand2 },
];

export default function CreativeStudioPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [useCase, setUseCase] = useState("shopify_product");
  const [platform, setPlatform] = useState("Shopify");
  const [brand, setBrand] = useState("");
  const [audience, setAudience] = useState("");
  const [brief, setBrief] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [elitePrompt, setElitePrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAssets() {
    const res = await fetch("/api/creative/list");
    const data = await res.json();
    if (Array.isArray(data)) setAssets(data);
  }

  async function buildPrompt() {
    if (!brief.trim() && !brand.trim()) {
      alert("Tell ALMA what you need first.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/creative/prompt", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        useCase,
        platform,
        brand,
        audience,
        brief,
        hasProduct:Boolean(productFile),
      }),
    });

    const data = await res.json();

    if (data.prompt) setElitePrompt(data.prompt);
    else alert(data.error || "Could not build prompt.");

    setLoading(false);
  }

  async function generate() {
    const finalPrompt = elitePrompt || brief;

    if (!finalPrompt.trim()) {
      alert("Build or write a prompt first.");
      return;
    }

    setLoading(true);

    if (productFile) {
      const form = new FormData();
      form.append("file", productFile);
      form.append("action", useCase.includes("white") ? "remove_background" : "replace_background");
      form.append("prompt", finalPrompt);

      const res = await fetch("/api/creative/upload-edit", {
        method:"POST",
        body:form,
      });

      const data = await res.json();
      if (!data.success) alert(data.error || data.message || "Could not generate from product.");
    } else {
      const selected = useCases.find((u)=>u.key === useCase);

      const res = await fetch("/api/creative/generate", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          prompt:finalPrompt,
          templateKey:useCase,
          title:selected?.label || "Nocturai Creative",
          category:selected?.group || "creative",
        }),
      });

      const data = await res.json();
      if (!data.success) alert(data.error || data.message || "Could not generate.");
    }

    setLoading(false);
    setProductFile(null);
    await loadAssets();
  }

  async function deleteAsset(id:string) {
    const ok = confirm("Delete this creative from your library?");
    if (!ok) return;

    await fetch("/api/creative/delete", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ id }),
    });

    await loadAssets();
  }

  function downloadBase64(base64:string, name:string) {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = name || "alma-nocturai.png";
    a.click();
  }

  useEffect(() => {
    loadAssets();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-black">
          <ArrowLeft className="h-4 w-4" />
          Back to ALMA
        </a>

        <section className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-[#E5E7EB] bg-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#9CA3AF]">ALMA Nocturai</p>
              <h1 className="mt-3 text-5xl font-normal tracking-tight md:text-7xl">Your AI creative director.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6B7280]">
                Upload a product, explain the goal, and ALMA writes the elite prompt for ads, Shopify, Amazon, product photos, brand visuals, or social content.
              </p>
            </div>

            <button
              onClick={buildPrompt}
              disabled={loading}
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Ask ALMA to write the prompt"}
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#6B7280]">What are you creating?</p>
              <div className="grid gap-2">
                {useCases.map((item)=>{
                  const Icon = item.icon;
                  const active = useCase === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={()=>setUseCase(item.key)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                        active ? "border-black bg-black text-white" : "border-[#E5E7EB] bg-[#F7F7F8] text-black hover:border-black"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className={active ? "text-xs text-white/60" : "text-xs text-[#6B7280]"}>{item.group}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#6B7280]">Product upload</p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[#D1D5DB] bg-[#F7F7F8] p-8 text-center hover:border-black">
                <Upload className="mb-3 h-6 w-6 text-[#6B7280]" />
                <span className="text-sm font-medium">{productFile ? productFile.name : "Upload product image"}</span>
                <span className="mt-1 text-xs text-[#6B7280]">Optional, but best for real product ads.</span>
                <input type="file" accept="image/*" hidden onChange={(e)=>setProductFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm md:p-6">
            <div className="grid gap-3 md:grid-cols-3">
              <input value={brand} onChange={(e)=>setBrand(e.target.value)} placeholder="Brand/product name" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
              <input value={platform} onChange={(e)=>setPlatform(e.target.value)} placeholder="Platform: Shopify, Amazon, Meta..." className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
              <input value={audience} onChange={(e)=>setAudience(e.target.value)} placeholder="Audience: luxury buyers, moms, gym..." className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            </div>

            <textarea
              value={brief}
              onChange={(e)=>setBrief(e.target.value)}
              placeholder="Tell ALMA what you need. Example: I need a luxury Shopify hero image for this skincare bottle. Make it clean, premium, white marble, soft daylight, high conversion."
              className="mt-4 min-h-36 w-full resize-none rounded-3xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
            />

            <div className="mt-4 rounded-3xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-widest text-[#6B7280]">ALMA elite prompt</p>
                <button onClick={buildPrompt} disabled={loading} className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black shadow-sm disabled:opacity-50">
                  Rewrite prompt
                </button>
              </div>

              <textarea
                value={elitePrompt}
                onChange={(e)=>setElitePrompt(e.target.value)}
                placeholder="ALMA will write the final production prompt here..."
                className="min-h-40 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-[#9CA3AF]"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={generate} disabled={loading || (!brief.trim() && !elitePrompt.trim())} className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
                <Sparkles className="h-4 w-4" />
                {loading ? "Creating..." : productFile ? "Generate with product" : "Generate image"}
              </button>
            </div>
          </section>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-normal tracking-tight">Nocturai Library</h2>
              <p className="mt-2 text-sm text-[#6B7280]">Your generated images, product edits, ads, and brand assets.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {assets.length === 0 ? (
              <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
                No Nocturai assets yet.
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="group overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white shadow-sm">
                  {asset.output_base64 ? (
                    <img src={`data:image/png;base64,${asset.output_base64}`} alt={asset.prompt || "Nocturai asset"} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-[#F7F7F8] p-5 text-center text-sm text-[#6B7280]">
                      {asset.type} saved
                    </div>
                  )}

                  <div className="p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#6B7280]">{asset.category}</div>
                    <div className="mt-2 line-clamp-3 text-sm leading-6">{asset.prompt}</div>

                    <div className="mt-4 flex gap-2">
                      {asset.output_base64 && (
                        <button onClick={()=>downloadBase64(asset.output_base64, `${asset.title || "nocturai"}.png`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-medium">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}

                      <button onClick={()=>deleteAsset(asset.id)} className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
