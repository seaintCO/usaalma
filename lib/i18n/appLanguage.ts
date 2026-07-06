"use client";

import { useEffect, useState } from "react";

export type AppLanguage = "en" | "es";

export function useAppLanguage() {
  const [language, setLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("lang");
    const saved = window.localStorage.getItem("alma_language");

    if (fromUrl === "en" || fromUrl === "es") {
      setLanguage(fromUrl);
      window.localStorage.setItem("alma_language", fromUrl);
      return;
    }

    if (saved === "en" || saved === "es") setLanguage(saved);
  }, []);

  return language;
}

export function pick<T>(language: AppLanguage, en: T, es: T) {
  return language === "es" ? es : en;
}
