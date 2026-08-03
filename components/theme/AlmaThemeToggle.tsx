"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type AlmaTheme = "dark" | "light";

const STORAGE_KEY = "alma-theme";
const THEME_EVENT = "alma-theme-change";

export function applyAlmaTheme(theme: AlmaTheme) {
  document.documentElement.dataset.almaTheme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function AlmaThemeBootstrap() {
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    applyAlmaTheme(stored === "light" ? "light" : "dark");
  }, []);
  return null;
}

export default function AlmaThemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<AlmaTheme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.almaTheme;
    const frame = window.requestAnimationFrame(() =>
      setTheme(current === "light" ? "light" : "dark"),
    );
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<AlmaTheme>).detail;
      if (next === "dark" || next === "light") setTheme(next);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(THEME_EVENT, onTheme);
    };
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={() => applyAlmaTheme(next)}
      aria-label={`Use ${label.toLowerCase()} appearance`}
      title={`Use ${label.toLowerCase()} appearance`}
      className={`alma-theme-toggle ${compact ? "alma-theme-toggle--compact" : ""}`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
