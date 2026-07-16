"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type TradingViewAdvancedChartProps = {
  symbol: string;
  language: AlmaShellLanguage;
  title: string;
  unavailableLabel: string;
  retryLabel: string;
};

const SCRIPT_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

function widgetLocale(language: AlmaShellLanguage) {
  return language === "es" ? "es" : "en";
}

export default function TradingViewAdvancedChart({
  symbol,
  language,
  title,
  unavailableLabel,
  retryLabel,
}: TradingViewAdvancedChartProps) {
  const rawId = useId();
  const containerId = useMemo(
    () => `tradingview-advanced-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setState("loading");
    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: widgetLocale(language),
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      calendar: true,
      support_host: "https://www.tradingview.com",
    });
    script.onload = () => setState("ready");
    script.onerror = () => setState("error");

    container.appendChild(widget);
    container.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
      container.innerHTML = "";
    };
  }, [containerId, language, retryKey, symbol]);

  return (
    <div
      className="relative h-[520px] min-w-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white md:h-[720px]"
      aria-label={title}
    >
      {state === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm text-[#6B7280]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {title}
        </div>
      ) : null}
      {state === "error" ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-6 text-center">
          <ShieldAlert className="h-8 w-8" />
          <p className="mt-3 max-w-sm text-sm text-[#6B7280]">
            {unavailableLabel}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </button>
        </div>
      ) : null}
      <div
        id={containerId}
        ref={containerRef}
        className="tradingview-widget-container h-full w-full min-w-0"
      />
    </div>
  );
}
