"use client";
import {
  Download,
  FolderPlus,
  ImageIcon,
  Palette,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { pick } from "@/lib/i18n/appLanguage";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";
import { useCreativeResourceDetail } from "@/components/creative-studio/useCreativeResourceDetail";
import { CreativeDetailPanel } from "@/components/creative-studio/CreativeDetailPanel";

type Asset = {
  id: string;
  title: string;
  prompt: string;
  output_base64?: string;
  category?: string;
  folder_id?: string;
  brand_kit_id?: string;
  campaign_id?: string;
};
type Kit = {
  id: string;
  name: string;
  voice?: string;
  audience?: string;
  colors?: string[];
};
type Campaign = {
  id: string;
  name: string;
  concept?: string;
  social_captions?: string;
  ad_copy?: string;
  product_photo_prompt?: string;
};
type Folder = { id: string; name: string };
const copy = {
  en: {
    title: "Creative Studio",
    subtitle: "Build real brand direction, campaigns, copy, and visual assets.",
    brand: "Brand kit",
    campaign: "Campaign",
    assets: "Asset library",
    save: "Save",
    create: "Create",
    generate: "Generate visual",
    generateCopy: "Generate campaign copy",
    reuse: "Reuse",
    delete: "Delete",
    download: "Download",
    empty: "Nothing saved yet.",
    name: "Name",
    voice: "Brand voice",
    audience: "Audience",
    colors: "Colors, comma separated",
    concept: "Campaign concept",
    prompt: "Product-photo prompt or visual brief",
    folder: "Folder",
    error: "Creative request failed.",
  },
  es: {
    title: "Estudio Creativo",
    subtitle:
      "Crea dirección de marca, campañas, copy y activos visuales reales.",
    brand: "Kit de marca",
    campaign: "Campaña",
    assets: "Biblioteca de activos",
    save: "Guardar",
    create: "Crear",
    generate: "Generar visual",
    generateCopy: "Generar copy de campaña",
    reuse: "Reutilizar",
    delete: "Eliminar",
    download: "Descargar",
    empty: "Aún no hay contenido guardado.",
    name: "Nombre",
    voice: "Voz de marca",
    audience: "Audiencia",
    colors: "Colores separados por coma",
    concept: "Concepto de campaña",
    prompt: "Prompt de foto de producto o brief visual",
    folder: "Carpeta",
    error: "La solicitud creativa falló.",
  },
};
export default function CreativeStudioPage() {
  const creativeResourceDetail = useCreativeResourceDetail();
  const { locale: language } = useAlmaLocale();
  const t = pick(language, copy.en, copy.es);
  const [assets, setAssets] = useState<Asset[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [kits, setKits] = useState<Kit[]>([]),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [brandName, setBrandName] = useState(""),
    [voice, setVoice] = useState(""),
    [audience, setAudience] = useState(""),
    [colors, setColors] = useState(""),
    [campaignName, setCampaignName] = useState(""),
    [concept, setConcept] = useState(""),
    [prompt, setPrompt] = useState(""),
    [folderId, setFolderId] = useState(""),
    [brandKitId, setBrandKitId] = useState(""),
    [campaignId, setCampaignId] = useState(""),
    [newFolder, setNewFolder] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const [a, f, b, c] = await Promise.all([
      fetch("/api/creative/list"),
      fetch("/api/creative/folders"),
      fetch("/api/creative/brand-kits"),
      fetch("/api/creative/campaigns"),
    ]);
    if (a.ok) setAssets(await a.json());
    if (f.ok) setFolders((await f.json()).folders ?? []);
    if (b.ok) setKits((await b.json()).brandKits ?? []);
    if (c.ok) setCampaigns((await c.json()).campaigns ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const post = async (url: string, body: unknown) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || data.success === false)
        throw new Error(data.error || data.message);
      await load();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const createKit = async () => {
    const data = await post("/api/creative/brand-kits", {
      name: brandName,
      voice,
      audience,
      colors: colors
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    });
    if (data?.brandKit) {
      setBrandKitId(data.brandKit.id);
      setBrandName("");
      setVoice("");
      setColors("");
    }
  };
  const createCampaign = async () => {
    const data = await post("/api/creative/campaigns", {
      name: campaignName,
      concept,
      audience,
      brandKitId: brandKitId || null,
      folderId: folderId || null,
      generateCopy: true,
    });
    if (data?.campaign) {
      setCampaignId(data.campaign.id);
      setPrompt(data.campaign.product_photo_prompt || concept);
    }
  };
  const createFolder = async () => {
    const data = await post("/api/creative/folders", { name: newFolder });
    if (data?.folder) {
      setFolderId(data.folder.id);
      setNewFolder("");
    }
  };
  const createAsset = () => {
    if (prompt.trim())
      void post("/api/creative/generate", {
        prompt,
        title: prompt.slice(0, 70),
        category: "campaign",
        folderId: folderId || null,
        brandKitId: brandKitId || null,
        campaignId: campaignId || null,
        idempotencyKey: crypto.randomUUID(),
      });
  };
  return (
    <AlmaShell language={language} activeWorkspace="creative" title={t.title}>
      <div className="px-4 py-8 text-black md:px-6">
        <div className="mx-auto max-w-7xl">
          <a href={DASHBOARD_ROUTE} className="text-sm text-[#6B7280]">
            ← ALMA
          </a>
          <header className="mt-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border bg-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-medium md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-[#6B7280]">{t.subtitle}</p>
          </header>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="flex items-center gap-2 font-medium">
                <Palette className="h-4 w-4" />
                {t.brand}
              </h2>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={t.name}
                className="mt-3 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <input
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                placeholder={t.voice}
                className="mt-2 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={t.audience}
                className="mt-2 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <input
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder={t.colors}
                className="mt-2 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <button
                onClick={createKit}
                disabled={loading || !brandName.trim()}
                className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white"
              >
                {t.save}
              </button>
              <div className="mt-4 space-y-1">
                {kits.map((kit) => (
                  <button
                    key={kit.id}
                    onClick={() => {
                      creativeResourceDetail.selectResource("brandKit", kit.id);
                      setBrandKitId(kit.id);
                      setAudience(kit.audience ?? "");
                    }}
                    className={`block w-full truncate rounded-lg p-2 text-left text-sm ${brandKitId === kit.id ? "bg-black text-white" : "bg-[#F7F7F8]"}`}
                  >
                    {kit.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="font-medium">{t.campaign}</h2>
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={t.name}
                className="mt-3 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <textarea
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder={t.concept}
                className="mt-2 min-h-24 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <button
                onClick={createCampaign}
                disabled={loading || !campaignName.trim()}
                className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white"
              >
                {t.generateCopy}
              </button>
              <div className="mt-4 space-y-1">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      creativeResourceDetail.selectResource("campaign", c.id);
                      setCampaignId(c.id);
                      setPrompt(c.product_photo_prompt || c.concept || "");
                    }}
                    className={`block w-full truncate rounded-lg p-2 text-left text-sm ${campaignId === c.id ? "bg-black text-white" : "bg-[#F7F7F8]"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="font-medium">{t.folder}</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder={t.name}
                  className="min-w-0 flex-1 rounded-xl bg-[#F7F7F8] p-3"
                />
                <button
                  onClick={createFolder}
                  className="rounded-xl bg-black p-3 text-white"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="mt-3 w-full rounded-xl bg-[#F7F7F8] p-3"
              >
                <option value="">{t.folder}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.prompt}
                className="mt-3 min-h-28 w-full rounded-xl bg-[#F7F7F8] p-3"
              />
              <button
                onClick={createAsset}
                disabled={loading || !prompt.trim()}
                className="mt-3 flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
              >
                <Wand2 className="h-4 w-4" />
                {loading ? "…" : t.generate}
              </button>
            </section>
          </div>
          <section className="mt-8">
            <h2 className="text-2xl font-medium">{t.assets}</h2>
            {assets.length === 0 ? (
              <p className="mt-3 text-sm text-[#6B7280]">{t.empty}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assets.map((asset) => (
                  <article
                    onClick={() =>
                      creativeResourceDetail.selectResource("asset", asset.id)
                    }
                    key={asset.id}
                    className="overflow-hidden rounded-2xl border bg-white"
                  >
                    {asset.output_base64 ? (
                      <img
                        src={`data:image/png;base64,${asset.output_base64}`}
                        alt={asset.prompt}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-[#F7F7F8]">
                        <ImageIcon className="text-[#6B7280]" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="line-clamp-2 text-sm">{asset.prompt}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setPrompt(asset.prompt)}
                          className="rounded-full border px-3 py-1.5 text-xs"
                        >
                          {t.reuse}
                        </button>
                        {asset.output_base64 && (
                          <a
                            href={`data:image/png;base64,${asset.output_base64}`}
                            download={`${asset.title}.png`}
                            className="rounded-full border px-3 py-1.5 text-xs"
                          >
                            <Download className="mr-1 inline h-3 w-3" />
                            {t.download}
                          </a>
                        )}
                        <button
                          onClick={() =>
                            void post("/api/creative/delete", { id: asset.id })
                          }
                          className="rounded-full border px-3 py-1.5 text-xs text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        <CreativeDetailPanel
          language={language}
          detail={creativeResourceDetail.detail}
          loading={creativeResourceDetail.loading}
          error={creativeResourceDetail.error}
          onClose={creativeResourceDetail.closeResource}
          onRetry={creativeResourceDetail.retry}
          onSelect={creativeResourceDetail.selectResource}
        />
      </div>
    </AlmaShell>
  );
}
