import type { Metadata } from "next";
import PublicAlmaSandbox from "@/components/marketing/PublicAlmaSandbox";

export const metadata: Metadata = {
  title: "ALMA — Autonomous Business Office",
  description:
    "Manage customers, conversations, money, tasks, invoices, documents, and daily operations in one bilingual business office.",
};

export default function HomePage() {
  return <PublicAlmaSandbox />;
}
