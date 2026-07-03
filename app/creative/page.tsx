"use client";

import { ImageIcon, Megaphone, Palette, Package, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

const templates = [
  { key:"logo", label:"Logo Concepts", group:"Brand Kit", icon:Palette },
  { key:"instagram_post", label:"Instagram Post", group:"Social", icon:Megaphone },
  { key:"instagram_story", label:"Instagram Story", group:"Social", icon:Megaphone },
  { key:"linkedin_banner", label:"LinkedIn Banner", group:"Social", icon:Megaphone },
  { key:"x_graphic", label:"X Graphic", group:"Social", icon:Megaphone },
  { key:"facebook_ad", label:"Facebook Ad", group:"Social", icon:Megaphone },
  { key:"white_background_product", label:"White Background", group:"Product", icon:Package },
  { key:"lifestyle_product", label:"Lifestyle Scene", group:"Product", icon:Package },
  { key:"apple_style_product", label:"Apple-style Shot", group:"Product", icon:Package },
  { key:"amazon_ready", label:"Amazon-ready", group:"Product", icon:Package },
  { key:"shopify_ready", label:"Shopify-ready", group:"Product", icon:Package },
  { key:"replace_background", label:"Replace Background", group:"Editing", icon:Wand2 },
  { key:"relighting", label:"Relighting", group:"Editing", icon:Wand2 },
  { key:"remove_background", label:"Remove Background", group:"Editing", icon:Wand2 },
  { key:"expand_image", label:"Expand Image", group:"Editing", icon:Wand2 },
  { key:"object_removal", label:"Object Removal", group:"Editing", icon:Wand2 },
  { key:"upscaling", label:"Upscaling", group:"Editing", icon:Wand2 },
];

export default function CreativeStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [templateKey, setTemplateKey] = useState("logo");
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editAction, setEditAction] = useState("remove_background");
  const [editPrompt, setEditPrompt] = useState("");

  async function loadAssets() {
    const res = await fetch("/api/creative/list");
    const data = await res.json();
    if (Array.isArray(data)) setAssets(data);
  }

  async function createAsset() {
    if (!prompt.trim()) return;

    setLoading(true);

    const res = await fetch("/api/creative/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        prompt,
        templateKey,
        title:templates.find((t) => t.key === templateKey)?.label || "Creative",
      }),
    });

    const data = await res.json();
    if (!data.success) alert(data.error || data.message || "No se pudo generar.");

    setPrompt("");
    setLoading(false);
    loadAssets();
  }

  async function uploadEdit() {
    if (!editFile) return;

    setLoading(true);

    const form = new FormData();
    form.append("file", editFile);
    form.append("action", editAction);
    form.append("prompt", editPrompt);

    const res = await fetch("/api/creative/upload-edit", {
      method:"POST",
      body:form,
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || data.message || "No se pudo subir la imagen.");
    }

    setEditFile(null);
    setEditPrompt("");
    setLoading(false);
    loadAssets();
  }

  async function createBrandKit() {
    if (!brandName.trim()) return;

    setLoading(true);

    const res = await fetch("/api/creative/brand-kit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ brandName, industry, style }),
    });

    const data = await res.json();
    if (!data.success) alert(data.error || data.message || "No se pudo crear brand kit.");

    setBrandName("");
    setIndustry("");
    setStyle("");
    setLoading(false);
    loadAssets();
  }

  useEffect(() => {
    loadAssets();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">← Volver a ALMA</a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Creative Studio</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Image editing, logos, brand kits, social graphics, ads, and product photography.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Brand Kit Generator</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Style: luxury, tech..." className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none" />
            <button onClick={createBrandKit} disabled={loading} className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
              Generate Brand Kit
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {templates.map((item) => {
            const Icon = item.icon;
            const active = templateKey === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setTemplateKey(item.key)}
                className={active ? "rounded-2xl border border-black bg-white p-4 text-left" : "rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left hover:border-black"}
              >
                <Icon className="mb-3 h-5 w-5" />
                <div className="font-medium">{item.label}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{item.group}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Image Editing</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Upload an image for remove background, replace background, relighting, upscaling, object removal, or expand image.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEditFile(e.target.files?.[0] || null)}
              className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 text-sm outline-none"
            />

            <select
              value={editAction}
              onChange={(e) => setEditAction(e.target.value)}
              className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
            >
              <option value="remove_background">Remove background</option>
              <option value="replace_background">Replace background</option>
              <option value="expand_image">Expand image</option>
              <option value="object_removal">Object removal</option>
              <option value="relighting">Relighting</option>
              <option value="upscaling">Upscaling</option>
            </select>

            <button
              onClick={uploadEdit}
              disabled={loading || !editFile}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Upload for edit
            </button>
          </div>

          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Optional: describe what should change..."
            className="mt-4 min-h-24 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">Create Asset</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: luxury ad for Alta Private Equity, Apple-style product shot, Instagram story for AI agency..."
            className="mt-5 min-h-32 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />
          <button onClick={createAsset} disabled={loading} className="mt-5 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            {loading ? "Creating..." : "Create"}
          </button>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-medium">Library</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {assets.length === 0 ? (
              <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
                No creative assets yet.
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white">
                  {asset.output_base64 ? (
                    <img src={`data:image/png;base64,${asset.output_base64}`} alt={asset.prompt} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-[#F7F7F8] p-5 text-center text-sm text-[#6B7280]">
                      {asset.type} saved
                    </div>
                  )}

                  <div className="p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#6B7280]">{asset.category}</div>
                    <div className="mt-2 text-sm leading-6">{asset.prompt}</div>

                    {asset.metadata?.brandKit && (
                      <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-[#F7F7F8] p-3 text-xs text-[#6B7280]">
{JSON.stringify(asset.metadata.brandKit, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}



