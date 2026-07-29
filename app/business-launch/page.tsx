"use client";

import AlmaShell from "@/components/alma-shell/AlmaShell";
import BusinessLaunchWorkspace from "@/components/business-launch/BusinessLaunchWorkspace";
import { businessLaunchCopy } from "@/lib/business-launch/copy";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

export default function BusinessLaunchPage() {
  const { locale, setLocale } = useAlmaLocale();
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="business_launch"
      title={businessLaunchCopy[locale].title}
      onLanguageChange={setLocale}
    >
      <BusinessLaunchWorkspace language={locale} />
    </AlmaShell>
  );
}
