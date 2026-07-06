import Link from "next/link";
import { ALMA_APPS } from "@/lib/platform/apps";

export default function PricingPage() {
  const paidApps = ALMA_APPS.filter((app) => !app.free);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard/apps" className="text-sm text-gray-500">? Back to Apps</Link>

        <h1 className="mt-8 text-5xl font-medium tracking-tight">Upgrade ALMA</h1>
        <p className="mt-4 max-w-2xl text-gray-500">
          Free apps cost no API. Paid apps unlock specialized systems and AI.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {paidApps.map((app) => (
            <div key={app.key} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-medium">{app.name}</h2>
              <p className="mt-3 text-4xl font-medium">{app.price}</p>
              <p className="mt-4 text-sm text-gray-500">Unlock {app.name} inside your ALMA account.</p>
              <Link href="/billing" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
                Continue
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
