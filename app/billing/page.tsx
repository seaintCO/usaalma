import Link from "next/link";

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/apps" className="text-sm text-gray-500">? Back to Apps</Link>

        <section className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Billing</p>
          <h1 className="mt-4 text-4xl font-medium">Subscriptions</h1>
          <p className="mt-4 text-gray-500">
            Stripe checkout connects here next. This page is now ready for ALMA app subscriptions.
          </p>

          <div className="mt-6 rounded-2xl bg-[#F7F7F8] p-5">
            <p className="text-sm text-gray-500">Next: connect Stripe products for Trade, Construct, Studio, and ALMA AI.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
