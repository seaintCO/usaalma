import Link from "next/link";

export const metadata = {
  title: "ALMA Office Privacy Policy",
  description: "How ALMA Office handles account and business data.",
};

const sections = [
  [
    "Information you provide",
    "ALMA may store account details, workspace settings, customers, conversations, tasks, appointments, estimates, invoices, payment status, transactions, receipts, documents, voice-agent configuration, and support messages that you choose to add.",
  ],
  [
    "iPhone permissions",
    "Camera, photo, document, microphone, Face ID, and notification access are requested only for features you choose. Permission can be changed in iPhone Settings. A push token may be associated with your signed-in account so ALMA can deliver workspace notifications.",
  ],
  [
    "AI processing",
    "When an entitled user intentionally invokes an AI feature, the relevant request and workspace context may be sent to the configured AI provider to produce that result. ALMA meters provider usage and does not require AI for ordinary Office calculations, filtering, records, or reports.",
  ],
  [
    "Connected services",
    "If you connect a third-party service such as email, messaging, accounting, payments, or voice, ALMA processes the minimum connection data needed for the requested workflow. Provider tokens are server-side and should never be placed in chat.",
  ],
  [
    "Security and sharing",
    "ALMA uses authenticated workspaces and access controls. We do not sell personal information. Data may be processed by infrastructure and service providers needed to operate ALMA, comply with law, prevent abuse, or complete a feature you requested.",
  ],
  [
    "Retention and choices",
    "You can update records in ALMA, disconnect supported services, disable notifications, request an export where available, or contact support about account deletion. Some audit, billing, security, or legal records may be retained as required.",
  ],
  [
    "Business and financial disclaimer",
    "ALMA organizes business information and can prepare reports for review. It is not a bank, law firm, tax filing service, payroll processor, or licensed accountant, and it does not guarantee legal, tax, payroll, or accounting accuracy.",
  ],
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-5 py-14 text-[#111111]">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-[#E5E7EB] bg-white p-7 shadow-sm md:p-12">
        <p className="text-xs uppercase tracking-[0.32em] text-[#667085]">
          ALMA Office
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#667085]">Effective July 31, 2026</p>
        <p className="mt-6 text-lg leading-8 text-[#667085]">
          This policy explains the principal data practices for the ALMA Office
          website and iPhone application. Actual collection depends on the
          features and providers a workspace enables.
        </p>
        <div className="mt-9 space-y-8">
          {sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 leading-7 text-[#667085]">{body}</p>
            </section>
          ))}
        </div>
        <section className="mt-9 border-t pt-7">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 leading-7 text-[#667085]">
            Privacy questions and account requests: support@seaintalma.com.
          </p>
          <Link
            href="/support"
            className="mt-4 inline-flex rounded-full bg-black px-5 py-3 font-medium text-white"
          >
            ALMA Support
          </Link>
        </section>
        <p className="mt-9 rounded-2xl bg-[#F7F7F8] p-5 text-sm leading-6 text-[#667085]">
          Resumen en español: ALMA procesa los datos de cuenta y negocio que
          eliges guardar, solicita permisos del iPhone solo al usar una función,
          no vende información personal y envía contenido a proveedores de IA
          solo cuando un usuario autorizado solicita una función de IA.
        </p>
      </article>
    </main>
  );
}
