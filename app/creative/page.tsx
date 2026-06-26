"use client";

import { ImageIcon, Megaphone, Palette, Play, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

const categories = [
  { key:"images", label:"Images", type:"image", icon:ImageIcon },
  { key:"product_photos", label:"Product Photos", type:"image", icon:ImageIcon },
  { key:"ads", label:"Ads", type:"image", icon:Megaphone },
  { key:"social_posts", label:"Social Posts", type:"image", icon:Sparkles },
  { key:"logos", label:"Logos", type:"image", icon:Palette },
  { key:"brand_kits", label:"Brand Kits", type:"brand", icon:Palette },
  { key:"video_prompts", label:"Video Prompts", type:"video_prompt", icon:Play },
  { key:"ai_editing", label:"AI Editing", type:"edit", icon:Wand2 },
];

export default function CreativeStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("images");
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAssets() {
    const res = await fetch("/api/creative/list");
    const data = await res.json();
    if (Array.isArray(data)) setAssets(data);
  }

  async function createAsset() {
    if (!prompt.trim()) return;

    const selected = categories.find((c) => c.key === category) || categories[0];

    setLoading(true);

    const res = await fetch("/api/creative/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        prompt,
        category:selected.key,
        type:selected.type,
        title:selected.label,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || data.message || "No se pudo generar.");
    }

    setPrompt("");
    setLoading(false);
    loadAssets();
  }

  useEffect(() => {
    loadAssets();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Sparkles className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Creative Studio
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Images, ads, logos, product photos, brand kits, video prompts and creative assets powered by ALMA.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {categories.map((item) => {
            const Icon = item.icon;
            const active = category === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                className={active
                  ? "rounded-2xl border border-black bg-white p-4 text-left shadow-sm"
                  : "rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left hover:border-black"
                }
              >
                <Icon className="mb-3 h-5 w-5" />
                <div className="font-medium">{item.label}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{item.type}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <h2 className="text-2xl font-medium">New Creation</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Describe what you want. ALMA will optimize the prompt and generate the asset.
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create a luxury Instagram ad for Alta Private Equity..."
            className="mt-5 min-h-32 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />

          <button
            onClick={createAsset}
            disabled={loading}
            className="mt-5 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
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
                    <img
                      src={`data:image/png;base64,${asset.output_base64}`}
                      alt={asset.prompt}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-[#F7F7F8] text-sm text-[#6B7280]">
                      {asset.type} saved
                    </div>
                  )}

                  <div className="p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#6B7280]">
                      {asset.category}
                    </div>
                    <div className="mt-2 text-sm leading-6">{asset.prompt}</div>
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
