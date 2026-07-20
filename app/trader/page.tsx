"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileImage,
  LineChart,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import TradingViewAdvancedChart from "@/components/trader/TradingViewAdvancedChart";
import { pick } from "@/lib/i18n/appLanguage";

type TabKey =
  "overview" | "chart" | "watchlist" | "analyze" | "journal" | "performance";
type AssetType = "equity" | "etf" | "crypto" | "option" | "future" | "other";
type Direction = "long" | "short" | "analysis" | "other";

type WatchlistItem = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  notes: string | null;
  created_at?: string;
};

type AnalysisItem = {
  id: string;
  symbol: string | null;
  timeframe: string | null;
  screenshot_id: string | null;
  content: string;
  notes: string | null;
  created_at?: string;
};

type JournalEntry = {
  id: string;
  symbol: string;
  direction: Direction;
  setup: string | null;
  entry_price: number | null;
  exit_price: number | null;
  position_size: number | null;
  stop_price: number | null;
  target_price: number | null;
  profit_loss: number | null;
  strategy: string | null;
  emotions: string | null;
  lessons: string | null;
  notes: string | null;
  screenshot_id: string | null;
  analysis_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  tags: string[];
  created_at?: string;
};

type Performance = {
  totalTrades?: number;
  closedTrades?: number;
  wins?: number;
  losses?: number;
  winRate?: number | null;
  profitLossTotal?: number | null;
  averageWin?: number | null;
  averageLoss?: number | null;
};

type Data = {
  watchlist: WatchlistItem[];
  journal: JournalEntry[];
  analyses: AnalysisItem[];
  performance: Performance;
};

type WatchlistForm = {
  id?: string;
  symbol: string;
  asset_type: AssetType;
  notes: string;
};

type JournalForm = {
  id?: string;
  symbol: string;
  direction: Direction;
  setup: string;
  strategy: string;
  entry_price: string;
  exit_price: string;
  position_size: string;
  stop_price: string;
  target_price: string;
  profit_loss: string;
  opened_at: string;
  closed_at: string;
  emotions: string;
  lessons: string;
  tags: string;
  notes: string;
  screenshot_id: string;
  analysis_id: string;
};

const emptyData: Data = {
  watchlist: [],
  journal: [],
  analyses: [],
  performance: {},
};

const blankWatchlistForm: WatchlistForm = {
  symbol: "",
  asset_type: "equity",
  notes: "",
};

const blankJournalForm: JournalForm = {
  symbol: "",
  direction: "long",
  setup: "",
  strategy: "",
  entry_price: "",
  exit_price: "",
  position_size: "",
  stop_price: "",
  target_price: "",
  profit_loss: "",
  opened_at: "",
  closed_at: "",
  emotions: "",
  lessons: "",
  tags: "",
  notes: "",
  screenshot_id: "",
  analysis_id: "",
};

const copy = {
  en: {
    title: "Trader",
    beta: "Beta",
    subtitle:
      "Educational chart analysis, watchlists, and a private trading journal.",
    noLiveData:
      "Live prices unavailable - no verified market-data provider is connected.",
    educationOnly:
      "Educational only - not investment advice or trade execution.",
    noBrokerage: "No brokerage execution is connected.",
    tabs: {
      overview: "Overview",
      chart: "Chart",
      watchlist: "Watchlist",
      analyze: "Analyze",
      journal: "Journal",
      performance: "Performance",
    },
    loading: "Loading Trader workspace...",
    error: "Trader workspace is unavailable. Try again.",
    retry: "Retry",
    marketState: "Market data state",
    educationalState: "Educational mode",
    totalTrades: "Total trades",
    closedTrades: "Closed trades",
    wins: "Wins",
    losses: "Losses",
    winRate: "Win rate",
    totalPl: "Total P/L",
    averageWin: "Average win",
    averageLoss: "Average loss",
    recentAnalyses: "Recent analyses",
    recentJournal: "Recent journal",
    noRecords: "No records yet.",
    addSymbol: "Add symbol",
    editSymbol: "Edit symbol",
    searchSymbols: "Search symbols",
    symbol: "Symbol",
    assetType: "Asset type",
    notes: "Notes",
    optionalNotes: "Optional notes",
    save: "Save",
    cancel: "Cancel",
    remove: "Remove",
    edit: "Edit",
    chartAnalysis: "Chart analysis",
    dropzone: "Upload a chart screenshot",
    dropzoneHelp: "PNG, JPG, or WebP. ALMA analyzes only what is visible.",
    replaceImage: "Replace image",
    removeImage: "Remove image",
    analyzeChart: "Analyze chart",
    analyzing: "Analyzing chart...",
    saveAnalysis: "Save analysis",
    analysisSaved: "Analysis saved.",
    result: "Analysis result",
    chooseImage: "Choose image",
    addEntry: "Add entry",
    editEntry: "Edit entry",
    filterJournal: "Filter by symbol or setup",
    trade: "Trade",
    execution: "Execution",
    risk: "Risk",
    outcome: "Outcome",
    psychology: "Psychology",
    linkage: "Linkage",
    direction: "Direction",
    setup: "Setup",
    strategy: "Strategy",
    entry: "Entry",
    exit: "Exit",
    size: "Size",
    opened: "Opened",
    closed: "Closed",
    stop: "Stop",
    target: "Target",
    profitLoss: "P/L",
    emotions: "Emotions",
    lessons: "Lessons",
    tags: "Tags",
    savedAnalysis: "Saved analysis",
    screenshot: "Screenshot",
    none: "None",
    symbolBreakdown: "Symbol breakdown",
    strategyBreakdown: "Strategy breakdown",
    riskReward: "Risk/reward observations",
    insufficient: "Add closed journal rows to see real performance.",
    enoughOnly: "Shown only when enough saved fields exist.",
    education: "Education",
    source: "Real saved journal rows only.",
    notAvailable: "Not available",
    selectAnalysis: "Select analysis",
    displayedSymbol: "Displayed symbol",
    viewChart: "View chart",
    openChart: "Open chart",
    liveChart: "View live chart",
    poweredByTradingView: "Chart display powered by TradingView.",
    marketDataAvailability:
      "Market data availability and delay depend on TradingView and the selected market.",
    chartDataBoundary:
      "ALMA does not use this chart data for automated analysis or execution.",
    analyzeScreenshot: "Analyze a screenshot",
    uploadForAnalysis:
      "Upload a chart image for educational ALMA analysis. ALMA cannot read the TradingView widget.",
    chartUnavailable: "TradingView chart is unavailable right now.",
    symbolSupport:
      "Not every symbol or exchange is supported. This is a display symbol, not an ALMA quote.",
  },
  es: {
    title: "Trader",
    beta: "Beta",
    subtitle:
      "Analisis educativo de graficos, listas y diario privado de trading.",
    noLiveData:
      "Precios en vivo no disponibles - no hay proveedor de datos verificado.",
    educationOnly:
      "Solo educativo - no es asesoramiento ni ejecucion de operaciones.",
    noBrokerage: "No hay ejecucion de broker conectada.",
    tabs: {
      overview: "Resumen",
      chart: "Grafico",
      watchlist: "Lista",
      analyze: "Analizar",
      journal: "Diario",
      performance: "Rendimiento",
    },
    loading: "Cargando Trader...",
    error: "Trader no esta disponible. Intentalo de nuevo.",
    retry: "Reintentar",
    marketState: "Estado de datos",
    educationalState: "Modo educativo",
    totalTrades: "Trades totales",
    closedTrades: "Trades cerrados",
    wins: "Ganadas",
    losses: "Perdidas",
    winRate: "Tasa de acierto",
    totalPl: "P/L total",
    averageWin: "Ganancia media",
    averageLoss: "Perdida media",
    recentAnalyses: "Analisis recientes",
    recentJournal: "Diario reciente",
    noRecords: "Aun no hay registros.",
    addSymbol: "Agregar simbolo",
    editSymbol: "Editar simbolo",
    searchSymbols: "Buscar simbolos",
    symbol: "Simbolo",
    assetType: "Tipo de activo",
    notes: "Notas",
    optionalNotes: "Notas opcionales",
    save: "Guardar",
    cancel: "Cancelar",
    remove: "Eliminar",
    edit: "Editar",
    chartAnalysis: "Analisis de grafico",
    dropzone: "Sube una captura del grafico",
    dropzoneHelp: "PNG, JPG o WebP. ALMA analiza solo lo visible.",
    replaceImage: "Cambiar imagen",
    removeImage: "Quitar imagen",
    analyzeChart: "Analizar grafico",
    analyzing: "Analizando grafico...",
    saveAnalysis: "Guardar analisis",
    analysisSaved: "Analisis guardado.",
    result: "Resultado",
    chooseImage: "Elegir imagen",
    addEntry: "Agregar entrada",
    editEntry: "Editar entrada",
    filterJournal: "Filtrar por simbolo o setup",
    trade: "Trade",
    execution: "Ejecucion",
    risk: "Riesgo",
    outcome: "Resultado",
    psychology: "Psicologia",
    linkage: "Vinculos",
    direction: "Direccion",
    setup: "Setup",
    strategy: "Estrategia",
    entry: "Entrada",
    exit: "Salida",
    size: "Tamano",
    opened: "Apertura",
    closed: "Cierre",
    stop: "Stop",
    target: "Objetivo",
    profitLoss: "P/L",
    emotions: "Emociones",
    lessons: "Lecciones",
    tags: "Etiquetas",
    savedAnalysis: "Analisis guardado",
    screenshot: "Captura",
    none: "Ninguno",
    symbolBreakdown: "Por simbolo",
    strategyBreakdown: "Por estrategia",
    riskReward: "Observaciones riesgo/recompensa",
    insufficient: "Agrega trades cerrados para ver rendimiento real.",
    enoughOnly: "Solo se muestra cuando hay suficientes campos guardados.",
    education: "Educacion",
    source: "Solo filas reales del diario guardado.",
    notAvailable: "No disponible",
    selectAnalysis: "Seleccionar analisis",
    displayedSymbol: "Simbolo mostrado",
    viewChart: "Ver grafico",
    openChart: "Abrir grafico",
    liveChart: "Ver grafico en vivo",
    poweredByTradingView: "Grafico mostrado por TradingView.",
    marketDataAvailability:
      "La disponibilidad y demora de datos dependen de TradingView y del mercado seleccionado.",
    chartDataBoundary:
      "ALMA no usa estos datos para analisis automatico ni ejecucion.",
    analyzeScreenshot: "Analizar una captura",
    uploadForAnalysis:
      "Sube una imagen del grafico para analisis educativo. ALMA no puede leer el widget de TradingView.",
    chartUnavailable: "El grafico de TradingView no esta disponible ahora.",
    symbolSupport:
      "No todos los simbolos o mercados son compatibles. Es un simbolo mostrado, no una cotizacion de ALMA.",
  },
};

const assetTypes: AssetType[] = [
  "equity",
  "etf",
  "crypto",
  "option",
  "future",
  "other",
];
const directions: Direction[] = ["long", "short", "analysis", "other"];
const DEFAULT_TRADINGVIEW_SYMBOL = "NASDAQ:AAPL";

function normalizeDisplaySymbol(value: string) {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9:._-]/g, "")
    .slice(0, 32);
  return cleaned || DEFAULT_TRADINGVIEW_SYMBOL;
}

function valueOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "--";
  const sign = number > 0 ? "+" : "";
  return `${sign}$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${Math.round(number * 100)}%`;
}

function signedClass(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "text-[#6B7280]";
  if (number > 0) return "text-emerald-700";
  if (number < 0) return "text-red-600";
  return "text-[#6B7280]";
}

function fieldNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function byMetric(entries: JournalEntry[], key: "symbol" | "strategy") {
  const map = new Map<
    string,
    {
      label: string;
      count: number;
      total: number;
      wins: number;
      losses: number;
    }
  >();
  for (const entry of entries) {
    const raw = key === "symbol" ? entry.symbol : entry.strategy;
    const label = raw?.trim() || "Unspecified";
    const current = map.get(label) ?? {
      label,
      count: 0,
      total: 0,
      wins: 0,
      losses: 0,
    };
    const pl = fieldNumber(entry.profit_loss);
    current.count += 1;
    if (pl !== null) {
      current.total += pl;
      if (pl > 0) current.wins += 1;
      if (pl < 0) current.losses += 1;
    }
    map.set(label, current);
  }
  return [...map.values()].sort(
    (a, b) => Math.abs(b.total) - Math.abs(a.total),
  );
}

function riskRewardRows(entries: JournalEntry[]) {
  return entries
    .map((entry) => {
      const entryPrice = fieldNumber(entry.entry_price);
      const stop = fieldNumber(entry.stop_price);
      const target = fieldNumber(entry.target_price);
      if (entryPrice === null || stop === null || target === null) return null;
      const risk = Math.abs(entryPrice - stop);
      const reward = Math.abs(target - entryPrice);
      if (!risk || !reward) return null;
      return { symbol: entry.symbol, ratio: reward / risk };
    })
    .filter(Boolean) as Array<{ symbol: string; ratio: number }>;
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] hover:text-black"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-medium ${tone ?? "text-black"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
      {text}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Activity;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="truncate text-xl font-medium">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function TraderPage() {
  const { locale: language } = useAlmaLocale();
  const t = pick(language, copy.en, copy.es);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchQuery, setWatchQuery] = useState("");
  const [selectedChartSymbol, setSelectedChartSymbol] = useState(
    DEFAULT_TRADINGVIEW_SYMBOL,
  );
  const [symbolInput, setSymbolInput] = useState(DEFAULT_TRADINGVIEW_SYMBOL);
  const [journalQuery, setJournalQuery] = useState("");
  const [watchlistForm, setWatchlistForm] =
    useState<WatchlistForm>(blankWatchlistForm);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [journalForm, setJournalForm] = useState<JournalForm>(blankJournalForm);
  const [journalOpen, setJournalOpen] = useState(false);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [analyzeSymbol, setAnalyzeSymbol] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [screenshotId, setScreenshotId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/trader/workspace", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load");
      setData(await response.json());
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const chartPreview = useMemo(
    () => (chartFile ? URL.createObjectURL(chartFile) : ""),
    [chartFile],
  );

  useEffect(() => {
    return () => {
      if (chartPreview) URL.revokeObjectURL(chartPreview);
    };
  }, [chartPreview]);

  const filteredWatchlist = useMemo(() => {
    const query = watchQuery.trim().toLowerCase();
    if (!query) return data.watchlist;
    return data.watchlist.filter(
      (item) =>
        item.symbol.toLowerCase().includes(query) ||
        item.asset_type.toLowerCase().includes(query) ||
        (item.notes ?? "").toLowerCase().includes(query),
    );
  }, [data.watchlist, watchQuery]);

  const filteredJournal = useMemo(() => {
    const query = journalQuery.trim().toLowerCase();
    if (!query) return data.journal;
    return data.journal.filter(
      (entry) =>
        entry.symbol.toLowerCase().includes(query) ||
        (entry.setup ?? "").toLowerCase().includes(query) ||
        (entry.strategy ?? "").toLowerCase().includes(query) ||
        (entry.tags ?? []).some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [data.journal, journalQuery]);

  const symbolBreakdown = useMemo(
    () => byMetric(data.journal, "symbol"),
    [data.journal],
  );
  const strategyBreakdown = useMemo(
    () => byMetric(data.journal, "strategy"),
    [data.journal],
  );
  const riskRows = useMemo(() => riskRewardRows(data.journal), [data.journal]);

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Activity }> = [
    { key: "overview", label: t.tabs.overview, icon: Activity },
    { key: "chart", label: t.tabs.chart, icon: LineChart },
    { key: "watchlist", label: t.tabs.watchlist, icon: LineChart },
    { key: "analyze", label: t.tabs.analyze, icon: FileImage },
    { key: "journal", label: t.tabs.journal, icon: ClipboardList },
    { key: "performance", label: t.tabs.performance, icon: BarChart3 },
  ];

  const openWatchlistForm = (item?: WatchlistItem) => {
    setWatchlistForm(
      item
        ? {
            id: item.id,
            symbol: item.symbol,
            asset_type: item.asset_type,
            notes: item.notes ?? "",
          }
        : blankWatchlistForm,
    );
    setWatchlistOpen(true);
  };

  const openChartForSymbol = (symbol: string) => {
    const next = normalizeDisplaySymbol(symbol);
    setSelectedChartSymbol(next);
    setSymbolInput(next);
    setActiveTab("chart");
  };

  const saveWatchlist = async () => {
    if (!watchlistForm.symbol.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/trader/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "watchlist",
          id: watchlistForm.id,
          symbol: watchlistForm.symbol.trim().toUpperCase(),
          asset_type: watchlistForm.asset_type,
          notes: valueOrNull(watchlistForm.notes),
        }),
      });
      if (!response.ok) throw new Error("save");
      setWatchlistOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openJournalForm = (entry?: JournalEntry) => {
    setJournalForm(
      entry
        ? {
            id: entry.id,
            symbol: entry.symbol,
            direction: entry.direction,
            setup: entry.setup ?? "",
            strategy: entry.strategy ?? "",
            entry_price:
              entry.entry_price === null ? "" : String(entry.entry_price),
            exit_price:
              entry.exit_price === null ? "" : String(entry.exit_price),
            position_size:
              entry.position_size === null ? "" : String(entry.position_size),
            stop_price:
              entry.stop_price === null ? "" : String(entry.stop_price),
            target_price:
              entry.target_price === null ? "" : String(entry.target_price),
            profit_loss:
              entry.profit_loss === null ? "" : String(entry.profit_loss),
            opened_at: toDateInput(entry.opened_at),
            closed_at: toDateInput(entry.closed_at),
            emotions: entry.emotions ?? "",
            lessons: entry.lessons ?? "",
            tags: (entry.tags ?? []).join(", "),
            notes: entry.notes ?? "",
            screenshot_id: entry.screenshot_id ?? "",
            analysis_id: entry.analysis_id ?? "",
          }
        : {
            ...blankJournalForm,
            symbol: analyzeSymbol || "",
            screenshot_id: screenshotId ?? "",
            analysis_id: analysisId ?? "",
          },
    );
    setJournalOpen(true);
  };

  const saveJournal = async () => {
    if (!journalForm.symbol.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/trader/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "journal",
          id: journalForm.id,
          symbol: journalForm.symbol.trim().toUpperCase(),
          direction: journalForm.direction,
          setup: valueOrNull(journalForm.setup),
          strategy: valueOrNull(journalForm.strategy),
          entry_price: numberOrNull(journalForm.entry_price),
          exit_price: numberOrNull(journalForm.exit_price),
          position_size: numberOrNull(journalForm.position_size),
          stop_price: numberOrNull(journalForm.stop_price),
          target_price: numberOrNull(journalForm.target_price),
          profit_loss: numberOrNull(journalForm.profit_loss),
          opened_at: fromDateInput(journalForm.opened_at),
          closed_at: fromDateInput(journalForm.closed_at),
          emotions: valueOrNull(journalForm.emotions),
          lessons: valueOrNull(journalForm.lessons),
          tags: journalForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          notes: valueOrNull(journalForm.notes),
          screenshot_id: valueOrNull(journalForm.screenshot_id),
          analysis_id: valueOrNull(journalForm.analysis_id),
        }),
      });
      if (!response.ok) throw new Error("save");
      setJournalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (
    kind: "watchlist" | "journal" | "analysis",
    id: string,
  ) => {
    await fetch(`/api/trader/workspace?kind=${kind}&id=${id}`, {
      method: "DELETE",
    });
    await load();
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    setChartFile(file);
    setAnalysis("");
    setScreenshotId(null);
    setAnalysisId(null);
    setStatus("");
  };

  const analyze = async () => {
    if (!chartFile) return;
    setBusy(true);
    setStatus("");
    try {
      const form = new FormData();
      form.append("file", chartFile);
      form.append(
        "question",
        `${t.educationOnly} Describe only visible structure, support/resistance, trend, momentum, liquidity, invalidation, and risk scenarios. Symbol: ${analyzeSymbol || "unknown"}.`,
      );
      const response = await fetch("/api/trading/chart-analyze", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "analysis");
      setAnalysis(result.answer ?? "");
      setScreenshotId(result.screenshotId ?? null);
    } catch {
      setStatus(t.error);
    } finally {
      setBusy(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysis.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/trader/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "analysis",
          symbol: valueOrNull(analyzeSymbol.toUpperCase()),
          content: analysis,
          notes: valueOrNull(analysisNotes),
          screenshot_id: screenshotId,
        }),
      });
      if (!response.ok) throw new Error("save");
      const result = await response.json();
      setAnalysisId(result.item.id);
      setStatus(t.analysisSaved);
      await load();
    } catch {
      setStatus(t.error);
    } finally {
      setSaving(false);
    }
  };

  const overview = (
    <section>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="h-4 w-4" />
            {t.marketState}
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">{t.noLiveData}</p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {t.educationalState}
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">{t.educationOnly}</p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            {t.beta}
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">{t.noBrokerage}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.totalTrades}
          value={String(data.performance.totalTrades ?? 0)}
        />
        <StatCard label={t.wins} value={String(data.performance.wins ?? 0)} />
        <StatCard
          label={t.losses}
          value={String(data.performance.losses ?? 0)}
        />
        <StatCard
          label={t.winRate}
          value={formatPercent(data.performance.winRate)}
        />
        <StatCard
          label={t.totalPl}
          value={formatMoney(data.performance.profitLossTotal)}
          tone={signedClass(data.performance.profitLossTotal)}
        />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="font-medium">{t.recentAnalyses}</h3>
          <div className="mt-3 space-y-2">
            {data.analyses.slice(0, 3).length ? (
              data.analyses.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#F7F7F8] p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {item.symbol || t.notAvailable}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[#6B7280]">
                    {item.content}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text={t.noRecords} />
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="font-medium">{t.recentJournal}</h3>
          <div className="mt-3 space-y-2">
            {data.journal.slice(0, 3).length ? (
              data.journal.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl bg-[#F7F7F8] p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{entry.symbol}</span>
                    <span className={signedClass(entry.profit_loss)}>
                      {formatMoney(entry.profit_loss)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#6B7280]">
                    {entry.setup || entry.strategy || t.noRecords}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text={t.noRecords} />
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const chart = (
    <section className="min-w-0">
      <SectionHeader icon={LineChart} title={t.tabs.chart} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="min-w-0 text-sm font-medium">
                {t.displayedSymbol}
                <input
                  value={symbolInput}
                  onChange={(event) =>
                    setSymbolInput(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9:._-]/g, ""),
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      openChartForSymbol(symbolInput);
                    }
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => openChartForSymbol(symbolInput)}
                className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-full bg-black px-5 text-sm font-medium text-white"
              >
                <LineChart className="h-4 w-4" />
                {t.viewChart}
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">
              {t.symbolSupport}
            </p>
          </div>

          <TradingViewAdvancedChart
            symbol={selectedChartSymbol}
            language={language}
            title={t.liveChart}
            unavailableLabel={t.chartUnavailable}
            retryLabel={t.retry}
          />
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="font-medium">{t.poweredByTradingView}</h3>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#6B7280]">
              <p>{t.marketDataAvailability}</p>
              <p>{t.chartDataBoundary}</p>
              <p>{t.educationOnly}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="font-medium">{t.analyzeScreenshot}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {t.uploadForAnalysis}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("analyze")}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium"
            >
              <FileImage className="h-4 w-4" />
              {t.analyzeScreenshot}
            </button>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <h3 className="font-medium">{t.tabs.watchlist}</h3>
            <div className="mt-3 space-y-2">
              {data.watchlist.slice(0, 6).length ? (
                data.watchlist.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openChartForSymbol(item.symbol)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#F7F7F8] px-3 text-left text-sm"
                  >
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-xs text-[#6B7280]">
                      {t.openChart}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState text={t.noRecords} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );

  const watchlist = (
    <section>
      <SectionHeader
        icon={LineChart}
        title={t.tabs.watchlist}
        action={
          <button
            type="button"
            onClick={() => openWatchlistForm()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {t.addSymbol}
          </button>
        }
      />
      <label className="mb-4 flex min-h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm">
        <Search className="h-4 w-4 text-[#6B7280]" />
        <input
          value={watchQuery}
          onChange={(event) => setWatchQuery(event.target.value)}
          placeholder={t.searchSymbols}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9CA3AF]"
        />
      </label>
      {filteredWatchlist.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredWatchlist.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-medium">{item.symbol}</p>
                  <p className="mt-1 text-sm capitalize text-[#6B7280]">
                    {item.asset_type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openChartForSymbol(item.symbol)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
                    aria-label={t.openChart}
                  >
                    <LineChart className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openWatchlistForm(item)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
                    aria-label={t.edit}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove("watchlist", item.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] text-red-600"
                    aria-label={t.remove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-[#6B7280]">
                {item.notes || t.optionalNotes}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text={t.noRecords} />
      )}
    </section>
  );

  const analyzeSection = (
    <section>
      <SectionHeader icon={FileImage} title={t.chartAnalysis} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F7F7F8] p-4 text-center"
          >
            {chartPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={chartPreview}
                alt=""
                className="max-h-72 w-full rounded-xl object-contain"
              />
            ) : (
              <>
                <Upload className="h-9 w-9" />
                <p className="mt-3 font-medium">{t.dropzone}</p>
                <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
                  {t.dropzoneHelp}
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              {chartFile ? t.replaceImage : t.chooseImage}
            </button>
            {chartFile ? (
              <button
                type="button"
                onClick={() => {
                  setChartFile(null);
                  setAnalysis("");
                  setScreenshotId(null);
                  setAnalysisId(null);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium"
              >
                <X className="h-4 w-4" />
                {t.removeImage}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={analyzeSymbol}
              onChange={(event) =>
                setAnalyzeSymbol(event.target.value.toUpperCase())
              }
              placeholder={t.symbol}
              className="min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none"
            />
            <input
              value={analysisNotes}
              onChange={(event) => setAnalysisNotes(event.target.value)}
              placeholder={t.optionalNotes}
              className="min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            disabled={!chartFile || busy}
            onClick={() => void analyze()}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileImage className="h-4 w-4" />
            )}
            {busy ? t.analyzing : t.analyzeChart}
          </button>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{t.result}</h3>
            <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs text-[#6B7280]">
              {t.beta}
            </span>
          </div>
          <div className="mt-3 min-h-64 rounded-2xl bg-[#F7F7F8] p-4 text-sm leading-6 text-black">
            {analysis ? (
              <p className="whitespace-pre-wrap">{analysis}</p>
            ) : (
              <p className="text-[#6B7280]">{t.educationOnly}</p>
            )}
          </div>
          {status ? (
            <p className="mt-3 text-sm text-[#6B7280]">{status}</p>
          ) : null}
          <button
            type="button"
            disabled={!analysis || saving}
            onClick={() => void saveAnalysis()}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t.saveAnalysis}
          </button>
        </div>
      </div>
    </section>
  );

  const journal = (
    <section>
      <SectionHeader
        icon={ClipboardList}
        title={t.tabs.journal}
        action={
          <button
            type="button"
            onClick={() => openJournalForm()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {t.addEntry}
          </button>
        }
      />
      <label className="mb-4 flex min-h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm">
        <Search className="h-4 w-4 text-[#6B7280]" />
        <input
          value={journalQuery}
          onChange={(event) => setJournalQuery(event.target.value)}
          placeholder={t.filterJournal}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9CA3AF]"
        />
      </label>
      {filteredJournal.length ? (
        <div className="space-y-3">
          {filteredJournal.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-medium">{entry.symbol}</h3>
                    <span className="rounded-full bg-[#F7F7F8] px-2 py-1 text-xs capitalize text-[#6B7280]">
                      {entry.direction}
                    </span>
                    {entry.strategy ? (
                      <span className="rounded-full bg-[#F7F7F8] px-2 py-1 text-xs text-[#6B7280]">
                        {entry.strategy}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    {entry.setup || entry.notes || t.noRecords}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${signedClass(entry.profit_loss)}`}
                  >
                    {formatMoney(entry.profit_loss)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openJournalForm(entry)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
                    aria-label={t.edit}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove("journal", entry.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] text-red-600"
                    aria-label={t.remove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7280]">
                {entry.opened_at ? (
                  <span>
                    {t.opened}: {formatDate(entry.opened_at)}
                  </span>
                ) : null}
                {entry.closed_at ? (
                  <span>
                    {t.closed}: {formatDate(entry.closed_at)}
                  </span>
                ) : null}
                {(entry.tags ?? []).map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text={t.noRecords} />
      )}
    </section>
  );

  const performance = (
    <section>
      <SectionHeader icon={BarChart3} title={t.tabs.performance} />
      <p className="mb-4 text-sm text-[#6B7280]">{t.source}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.closedTrades}
          value={String(data.performance.closedTrades ?? 0)}
        />
        <StatCard
          label={t.winRate}
          value={formatPercent(data.performance.winRate)}
        />
        <StatCard
          label={t.averageWin}
          value={formatMoney(data.performance.averageWin)}
          tone={signedClass(data.performance.averageWin)}
        />
        <StatCard
          label={t.averageLoss}
          value={formatMoney(data.performance.averageLoss)}
          tone={signedClass(data.performance.averageLoss)}
        />
        <StatCard
          label={t.totalPl}
          value={formatMoney(data.performance.profitLossTotal)}
          tone={signedClass(data.performance.profitLossTotal)}
        />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title={t.symbolBreakdown}
          rows={symbolBreakdown}
          empty={t.insufficient}
        />
        <BreakdownCard
          title={t.strategyBreakdown}
          rows={strategyBreakdown.filter((row) => row.label !== "Unspecified")}
          empty={t.insufficient}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h3 className="font-medium">{t.riskReward}</h3>
        <p className="mt-1 text-sm text-[#6B7280]">{t.enoughOnly}</p>
        {riskRows.length ? (
          <div className="mt-3 space-y-2">
            {riskRows.slice(0, 6).map((row, index) => (
              <div
                key={`${row.symbol}-${index}`}
                className="flex items-center justify-between rounded-xl bg-[#F7F7F8] px-3 py-2 text-sm"
              >
                <span>{row.symbol}</span>
                <span>{row.ratio.toFixed(2)}R</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState text={t.insufficient} />
          </div>
        )}
      </div>
    </section>
  );

  const activeSection: Record<TabKey, React.ReactNode> = {
    overview,
    chart,
    watchlist,
    analyze: analyzeSection,
    journal,
    performance,
  };

  return (
    <AlmaShell language={language} activeWorkspace="trader" title={t.title}>
      <div className="min-w-0 bg-[#F7F7F8] px-3 py-4 text-black sm:px-4 md:px-6">
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-hidden">
          <header className="mb-4 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
                {t.title}
              </h1>
              <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium">
                {t.beta}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6B7280] sm:hidden">
              {language === "es"
                ? "Diario educativo y analisis de graficas."
                : "Educational journal and chart analysis."}
            </p>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[#6B7280] sm:block md:text-base">
              {t.subtitle}
            </p>
          </header>
          <div className="mb-4 w-full min-w-0 max-w-full overflow-x-auto pb-1">
            <div className="inline-flex w-max max-w-none gap-2">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-medium ${
                    activeTab === key
                      ? "border-black bg-black text-white"
                      : "border-[#E5E7EB] bg-white text-[#6B7280]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-sm text-[#6B7280]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.loading}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 min-h-11 rounded-full bg-black px-4 text-sm font-medium text-white"
              >
                {t.retry}
              </button>
            </div>
          ) : (
            activeSection[activeTab]
          )}
        </div>
      </div>
      {watchlistOpen ? (
        <Modal
          title={watchlistForm.id ? t.editSymbol : t.addSymbol}
          onClose={() => setWatchlistOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t.symbol}
              <input
                value={watchlistForm.symbol}
                onChange={(event) =>
                  setWatchlistForm({
                    ...watchlistForm,
                    symbol: event.target.value.toUpperCase(),
                  })
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-[#E5E7EB] px-3 outline-none"
              />
            </label>
            <label className="text-sm font-medium">
              {t.assetType}
              <select
                value={watchlistForm.asset_type}
                onChange={(event) =>
                  setWatchlistForm({
                    ...watchlistForm,
                    asset_type: event.target.value as AssetType,
                  })
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 outline-none"
              >
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              {t.notes}
              <textarea
                value={watchlistForm.notes}
                onChange={(event) =>
                  setWatchlistForm({
                    ...watchlistForm,
                    notes: event.target.value,
                  })
                }
                className="mt-1 min-h-28 w-full resize-none rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setWatchlistOpen(false)}
              className="min-h-11 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              disabled={saving || !watchlistForm.symbol.trim()}
              onClick={() => void saveWatchlist()}
              className="min-h-11 rounded-full bg-black px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              {t.save}
            </button>
          </div>
        </Modal>
      ) : null}
      {journalOpen ? (
        <Modal
          title={journalForm.id ? t.editEntry : t.addEntry}
          onClose={() => setJournalOpen(false)}
        >
          <JournalFormContent
            form={journalForm}
            setForm={setJournalForm}
            analyses={data.analyses}
            t={t}
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setJournalOpen(false)}
              className="min-h-11 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              disabled={saving || !journalForm.symbol.trim()}
              onClick={() => void saveJournal()}
              className="min-h-11 rounded-full bg-black px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              {t.save}
            </button>
          </div>
        </Modal>
      ) : null}
    </AlmaShell>
  );
}

function BreakdownCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{
    label: string;
    count: number;
    total: number;
    wins: number;
    losses: number;
  }>;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => Math.abs(row.total)), 1);
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <h3 className="font-medium">{title}</h3>
      {rows.length ? (
        <div className="mt-3 space-y-3">
          {rows.slice(0, 8).map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.label}</span>
                <span className={signedClass(row.total)}>
                  {formatMoney(row.total)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F7F7F8]">
                <div
                  className={`h-full rounded-full ${row.total >= 0 ? "bg-emerald-600" : "bg-red-500"}`}
                  style={{
                    width: `${Math.max(8, (Math.abs(row.total) / max) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                {row.count} rows - {row.wins} wins / {row.losses} losses
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState text={empty} />
        </div>
      )}
    </div>
  );
}

function JournalFormContent({
  form,
  setForm,
  analyses,
  t,
}: {
  form: JournalForm;
  setForm: (form: JournalForm) => void;
  analyses: AnalysisItem[];
  t: typeof copy.en;
}) {
  const inputClass =
    "mt-1 min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 outline-none";
  const numberProps = { inputMode: "decimal" as const };
  return (
    <div className="space-y-5">
      <FieldGroup title={t.trade}>
        <label className="text-sm font-medium">
          {t.symbol}
          <input
            value={form.symbol}
            onChange={(event) =>
              setForm({ ...form, symbol: event.target.value.toUpperCase() })
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          {t.direction}
          <select
            value={form.direction}
            onChange={(event) =>
              setForm({ ...form, direction: event.target.value as Direction })
            }
            className={inputClass}
          >
            {directions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t.setup}
          <input
            value={form.setup}
            onChange={(event) =>
              setForm({ ...form, setup: event.target.value })
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          {t.strategy}
          <input
            value={form.strategy}
            onChange={(event) =>
              setForm({ ...form, strategy: event.target.value })
            }
            className={inputClass}
          />
        </label>
      </FieldGroup>
      <FieldGroup title={t.execution}>
        <NumberField
          label={t.entry}
          value={form.entry_price}
          onChange={(value) => setForm({ ...form, entry_price: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
        <NumberField
          label={t.exit}
          value={form.exit_price}
          onChange={(value) => setForm({ ...form, exit_price: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
        <NumberField
          label={t.size}
          value={form.position_size}
          onChange={(value) => setForm({ ...form, position_size: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
        <label className="text-sm font-medium">
          {t.opened}
          <input
            type="datetime-local"
            value={form.opened_at}
            onChange={(event) =>
              setForm({ ...form, opened_at: event.target.value })
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          {t.closed}
          <input
            type="datetime-local"
            value={form.closed_at}
            onChange={(event) =>
              setForm({ ...form, closed_at: event.target.value })
            }
            className={inputClass}
          />
        </label>
      </FieldGroup>
      <FieldGroup title={t.risk}>
        <NumberField
          label={t.stop}
          value={form.stop_price}
          onChange={(value) => setForm({ ...form, stop_price: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
        <NumberField
          label={t.target}
          value={form.target_price}
          onChange={(value) => setForm({ ...form, target_price: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
      </FieldGroup>
      <FieldGroup title={t.outcome}>
        <NumberField
          label={t.profitLoss}
          value={form.profit_loss}
          onChange={(value) => setForm({ ...form, profit_loss: value })}
          inputClass={inputClass}
          numberProps={numberProps}
        />
      </FieldGroup>
      <FieldGroup title={t.psychology}>
        <label className="text-sm font-medium">
          {t.emotions}
          <input
            value={form.emotions}
            onChange={(event) =>
              setForm({ ...form, emotions: event.target.value })
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          {t.lessons}
          <input
            value={form.lessons}
            onChange={(event) =>
              setForm({ ...form, lessons: event.target.value })
            }
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          {t.tags}
          <input
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          {t.notes}
          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            className="mt-1 min-h-28 w-full resize-none rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none"
          />
        </label>
      </FieldGroup>
      <FieldGroup title={t.linkage}>
        <label className="text-sm font-medium">
          {t.savedAnalysis}
          <select
            value={form.analysis_id}
            onChange={(event) =>
              setForm({ ...form, analysis_id: event.target.value })
            }
            className={inputClass}
          >
            <option value="">{t.none}</option>
            {analyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.symbol || t.selectAnalysis} -{" "}
                {formatDate(analysis.created_at)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t.screenshot}
          <input
            value={form.screenshot_id}
            onChange={(event) =>
              setForm({ ...form, screenshot_id: event.target.value })
            }
            className={inputClass}
          />
        </label>
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-[#6B7280]">
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  onChange,
  inputClass,
  numberProps,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  numberProps: { inputMode: "decimal" };
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        {...numberProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}
