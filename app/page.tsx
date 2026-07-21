import type { Metadata } from "next";
import PublicAlmaSandbox from "@/components/marketing/PublicAlmaSandbox";

export const metadata: Metadata = {
  title: "ALMA — Your bilingual AI operating system",
  description:
    "Experience ALMA through a safe interactive demo, then choose the plan that fits your work.",
};

export default function HomePage() {
  return <PublicAlmaSandbox />;
}
