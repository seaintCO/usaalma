"use client";

import { ImageIcon, Sparkles, Download, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1:1");
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadImages() {
    const res = await fetch("/api/images/list");
    const data = await res.json();
    if (Array.isArray(data)) setImages(data);
  }

  async function generateImage() {
    if (!prompt.trim()) return;

    setLoading(true);

    const res = await fetch("/api/images/generate", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ prompt, size }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || data.message || "No se pudo generar la imagen.");
    }

    setPrompt("");
    setLoading(false);
    loadImages();
  }

  useEffect(() => {
    loadImages();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <ImageIcon className="h-5 w-5" />
            </div>

            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Images
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
              Genera fotos, logos, anuncios y visuales premium. También puedes generar desde el chat principal.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: hyper realistic black lion in a luxury studio, cinematic lighting, no AI look..."
            className="min-h-28 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />

          <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex gap-2">
              {["1:1", "16:9", "9:16"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={size === s ? "rounded-full bg-black px-4 py-2 text-sm text-white" : "rounded-full border border-[#E5E7EB] px-4 py-2 text-sm text-[#6B7280] hover:text-black"}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={generateImage}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Generando imagen premium..." : "Generar"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="group overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative overflow-hidden">
                <img
                  src={`data:image/png;base64,${img.image_base64}`}
                  alt={img.prompt}
                  className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-x-3 bottom-3 hidden justify-between gap-2 group-hover:flex">
                  <button className="rounded-full bg-white/90 px-3 py-2 text-xs font-medium backdrop-blur">
                    <Wand2 className="mr-1 inline h-3 w-3" />
                    Remix
                  </button>
                  <a
                    href={`data:image/png;base64,${img.image_base64}`}
                    download="alma-image.png"
                    className="rounded-full bg-white/90 px-3 py-2 text-xs font-medium backdrop-blur"
                  >
                    <Download className="mr-1 inline h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]">
                  ALMA IMAGE
                </div>
                <div className="line-clamp-2 text-sm text-[#111111]">
                  {img.prompt}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
