import AlmaAutoTranslate from "@/components/AlmaAutoTranslate";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALMA — Your bilingual AI operating system",
  description:
    "Experience and operate ALMA across business, planning, communication, and creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AlmaAutoTranslate />
        {children}
      </body>
    </html>
  );
}
