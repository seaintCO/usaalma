import Link from "next/link";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-gray-500">? Back to ALMA</Link>

        <h1 className="mt-8 text-5xl font-medium">Universal Search</h1>
        <p className="mt-4 text-gray-500">
          Search across apps, customers, invoices, notes, files, jobs, and chats.
        </p>

        <div className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <input
            placeholder="Search ALMA..."
            className="w-full rounded-2xl bg-[#F7F7F8] px-5 py-4 text-lg outline-none"
          />
          <div className="mt-5 rounded-2xl bg-[#F7F7F8] p-5 text-sm text-gray-500">
            Search backend connects here next.
          </div>
        </div>
      </div>
    </main>
  );
}
