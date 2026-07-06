import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-gray-500">
          Back to ALMA
        </Link>

        <section className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Platform</p>
          <h1 className="mt-4 text-4xl font-medium">Settings</h1>
          <p className="mt-4 text-gray-500">
            Account, workspace, app access, and AI usage settings will live here.
          </p>
        </section>
      </div>
    </main>
  );
}
