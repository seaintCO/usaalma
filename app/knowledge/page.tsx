"use client";

import Link from "next/link";
import {
  BookOpen,
  Building2,
  FileText,
  NotebookPen,
  PackageSearch,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

const copy = {
  en: {
    title: "Knowledge",
    subtitle: "The approved information ALMA uses to understand your business.",
    profile: "Business profile",
    profileBody: "Identity, industry, policies, language, and operating rules.",
    services: "Services & pricing",
    servicesBody: "Your approved service catalog and estimate price book.",
    docs: "Documents",
    docsBody: "Private files, agreements, policies, and reference material.",
    notes: "Notes",
    notesBody: "Owned context and decisions that should stay close.",
    launch: "Business Launch",
    launchBody:
      "Build a formation checklist, open official filing sites, and track compliance without storing sensitive identity data.",
    open: "Open",
    caution:
      "Only approved knowledge should be used for customer-facing claims, estimates, or financial work.",
  },
  es: {
    title: "Conocimiento",
    subtitle: "La información aprobada que ALMA usa para entender tu negocio.",
    profile: "Perfil del negocio",
    profileBody: "Identidad, industria, políticas, idioma y reglas operativas.",
    services: "Servicios y precios",
    servicesBody: "Tu catálogo aprobado y lista de precios para estimados.",
    docs: "Documentos",
    docsBody: "Archivos privados, acuerdos, políticas y referencias.",
    notes: "Notas",
    notesBody: "Contexto y decisiones propias que deben permanecer cerca.",
    launch: "Lanzamiento del negocio",
    launchBody:
      "Crea una lista de formación, abre sitios oficiales y controla el cumplimiento sin guardar datos sensibles de identidad.",
    open: "Abrir",
    caution:
      "Solo el conocimiento aprobado debe usarse en mensajes, estimados o trabajo financiero.",
  },
} as const;

export default function KnowledgePage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const cards = [
    {
      title: t.profile,
      body: t.profileBody,
      href: "/settings",
      icon: BookOpen,
    },
    {
      title: t.services,
      body: t.servicesBody,
      href: "/office",
      icon: PackageSearch,
    },
    { title: t.docs, body: t.docsBody, href: "/documents", icon: FileText },
    { title: t.notes, body: t.notesBody, href: "/notes", icon: NotebookPen },
    {
      title: t.launch,
      body: t.launchBody,
      href: "/business-launch",
      icon: Building2,
    },
  ];
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="knowledge"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <p className="max-w-3xl text-lg text-[#667085]">{t.subtitle}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cards.map(({ title, body, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 transition hover:shadow-sm"
            >
              <Icon className="h-5 w-5" />
              <h2 className="mt-6 text-xl font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              <span className="mt-5 inline-flex text-sm font-medium">
                {t.open} →
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-sm text-[#667085]">
          {t.caution}
        </p>
      </div>
    </AlmaShell>
  );
}
