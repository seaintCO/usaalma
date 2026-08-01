import Link from "next/link";

export const metadata = {
  title: "ALMA Office Support",
  description: "Support and account help for ALMA Office.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-5 py-14 text-[#111111]">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#E5E7EB] bg-white p-7 shadow-sm md:p-12">
        <p className="text-xs uppercase tracking-[0.32em] text-[#667085]">
          ALMA Office
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Support</h1>
        <p className="mt-4 text-lg leading-8 text-[#667085]">
          Get help with sign-in, onboarding, customers, money, Inbox, ALMA,
          connections, billing status, or the iPhone app.
        </p>
        <section className="mt-8 rounded-3xl bg-[#F7F7F8] p-6">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 leading-7 text-[#667085]">
            Email{" "}
            <a
              className="font-medium text-black underline"
              href="mailto:support@seaintalma.com"
            >
              support@seaintalma.com
            </a>{" "}
            with the email on your ALMA account, a short description, and a
            screenshot that contains no passwords, API keys, payment numbers, or
            private customer data.
          </p>
        </section>
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="rounded-2xl bg-black px-5 py-4 text-center font-medium text-white"
          >
            Sign in to ALMA
          </Link>
          <Link
            href="/privacy"
            className="rounded-2xl border border-[#D8DCE2] px-5 py-4 text-center font-medium"
          >
            Privacy policy
          </Link>
        </section>
        <p className="mt-9 border-t pt-7 text-sm leading-6 text-[#667085]">
          Español: escríbenos a support@seaintalma.com para recibir ayuda con tu
          cuenta o la app para iPhone.
        </p>
      </div>
    </main>
  );
}
