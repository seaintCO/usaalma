"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALMA_LOCALE_COOKIE,
  DEFAULT_ALMA_LOCALE,
  isAlmaLocale,
  type AlmaLocale,
} from "./locale";

function initialLocale(): AlmaLocale {
  if (typeof document === "undefined") return DEFAULT_ALMA_LOCALE;
  const cookieLocale = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${ALMA_LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (isAlmaLocale(cookieLocale)) return cookieLocale;
  const stored = window.localStorage.getItem("alma_language");
  return isAlmaLocale(stored) ? stored : DEFAULT_ALMA_LOCALE;
}

export function useAlmaLocale() {
  const [locale, setLocaleState] = useState<AlmaLocale>(initialLocale);

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      if (isAlmaLocale(next)) setLocaleState(next);
    };
    window.addEventListener("alma-language-change", onChange);
    return () => window.removeEventListener("alma-language-change", onChange);
  }, []);

  const setLocale = useCallback(async (next: AlmaLocale) => {
    setLocaleState(next);
    await persistAlmaLocale(next);
  }, []);

  return { locale, setLocale };
}

export async function persistAlmaLocale(next: AlmaLocale) {
  window.localStorage.setItem("alma_language", next);
  document.cookie = `${ALMA_LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(
    new CustomEvent("alma-language-change", { detail: next }),
  );
  try {
    await fetch("/api/settings/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    });
  } catch {
    // The cookie/local preference remains usable while persistence retries later.
  }
}
