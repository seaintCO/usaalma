"use client";

import { ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function ImagesPage() {
  const [prompt, setPrompt] = useState("");
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
      body:JSON.stringify({ prompt }),
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
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <ImageIcon className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Image Generator
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Genera imágenes, conceptos, mockups y contenido visual desde ALMA.
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe la imagen que quieres generar..."
            className="min-h-32 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
          />

          <button
            onClick={generateImage}
            disabled={loading}
            className="mt-5 flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Generando..." : "Generar imagen"}
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white">
              <img
                src={`data:image/png;base64,${img.image_base64}`}
                alt={img.prompt}
                className="aspect-square w-full object-cover"
              />
              <div className="p-4 text-sm text-[#6B7280]">
                {img.prompt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
