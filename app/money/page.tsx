"use client";

import AlmaShell from "@/components/alma-shell/AlmaShell";
import MoneyWorkspace from "@/components/business-office/MoneyWorkspace";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

export default function MoneyPage() {
  const { locale, setLocale } = useAlmaLocale();
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="money"
      title={locale === "es" ? "Dinero" : "Money"}
      onLanguageChange={setLocale}
    >
      <MoneyWorkspace language={locale} />
    </AlmaShell>
  );
}
