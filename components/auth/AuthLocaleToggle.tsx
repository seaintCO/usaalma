"use client";

import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { authMessages } from "@/lib/i18n/messages";

export default function AuthLocaleToggle() {
  const { locale, setLocale } = useAlmaLocale();
  const text = authMessages[locale];
  return (
    <div className="flex justify-end" aria-label={text.language}>
      <div className="grid grid-cols-2 rounded-xl border border-[#E5E7EB] bg-white p-1">
        {(["en", "es"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void setLocale(item)}
            aria-pressed={locale === item}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${locale === item ? "bg-black text-white" : "text-[#6B7280]"}`}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
