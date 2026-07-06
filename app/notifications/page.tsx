import Link from "next/link";

const notifications = [
  { app: "Planner", text: "Today's tasks will appear here." },
  { app: "Construct", text: "Job, invoice, and lead alerts will appear here." },
  { app: "AI", text: "AI usage and automation alerts will appear here." },
];

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-gray-500">
          Back to ALMA
        </Link>

        <h1 className="mt-8 text-5xl font-medium">Notifications</h1>

        <div className="mt-8 space-y-3">
          {notifications.map((item) => (
            <div key={item.app} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{item.app}</p>
              <p className="mt-2">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
