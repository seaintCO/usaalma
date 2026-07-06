import Link from "next/link";
import { ALMA_APPS } from "@/lib/platform/apps";

export default function AppsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm text-gray-500">? Back to ALMA</Link>

        <section className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">ALMA Platform</p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight md:text-6xl">Your Apps</h1>
          <p className="mt-4 max-w-3xl text-gray-500">
            ALMA is the platform. Apps are the value. AI is the premium layer.
          </p>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALMA_APPS.map((app) => (
            <Link
              key={app.key}
              href={app.free ? app.href : `/pricing?app=${app.key}`}
              className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium">{app.name}</h2>
                <span className={`rounded-full px-3 py-1 text-xs ${app.free ? "bg-green-100 text-green-700" : "bg-black text-white"}`}>
                  {app.price}
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                {app.free ? "Included with every ALMA account." : "Premium app. Unlock with subscription."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
