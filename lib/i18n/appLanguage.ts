"use client";

import { useEffect, useState } from "react";

export type AppLanguage = "en" | "es";

export function useAppLanguage() {
  const [language, setLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    const sync = () => {
      const saved = window.localStorage.getItem("alma_language");
      if (saved === "en" || saved === "es") setLanguage(saved);
    };

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("alma-language-change", sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("alma-language-change", sync as EventListener);
    };
  }, []);

  return language;
}

export function pick<T>(language: AppLanguage, en: T, es: T) {
  return language === "es" ? es : en;
}
