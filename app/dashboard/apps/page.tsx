import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  Dumbbell,
  FileText,
  ImageIcon,
  MessageSquare,
  Mic,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";

const appGroups = [
  {
    title: "Free Apps",
    description: "No API cost. Useful tools that keep people inside ALMA every day.",
    apps: [
      { name: "Planner", href: "/planner", status: "Free", icon: CalendarDays, desc: "Plan days, goals, and schedules." },
      { name: "Tasks", href: "/tasks", status: "Free", icon: FileText, desc: "Track work, reminders, and priorities." },
      { name: "Notes", href: "/notes", status: "Free", icon: FileText, desc: "Save ideas, notes, and business info." },
      { name: "Fitness", href: "/fitness", status: "Free", icon: Dumbbell, desc: "Food, workouts, and progress tracking." },
      { name: "CRM", href: "/crm", status: "Free", icon: Users, desc: "Customers, leads, and business contacts." },
      { name: "Invoices", href: "/invoicing", status: "Free", icon: ReceiptText, desc: "Create, download, and send invoices." },
    ],
  },
  {
    title: "Premium Apps",
    description: "Specialized tools people pay for because they solve a specific workflow.",
    apps: [
      { name: "Trade", href: "/trader", status: "$39/mo", icon: TrendingUp, desc: "Journal, performance, analysis, and coaching." },
      { name: "Construct", href: "/crm", status: "$79/mo", icon: BriefcaseBusiness, desc: "Leads, bids, invoices, jobs, and clients." },
      { name: "Studio", href: "/creative", status: "$29/mo", icon: ImageIcon, desc: "Brand assets, images, content, and launches." },
    ],
  },
  {
    title: "AI Layer",
    description: "AI should be paid because every prompt, voice call, image, and file analysis has cost.",
    apps: [
      { name: "ALMA AI", href: "/dashboard", status: "$39/mo", icon: MessageSquare, desc: "Chat, files, memory, writing, and research." },
      { name: "Voice", href: "/receptionist", status: "Usage", icon: Mic, desc: "AI receptionist, calls, and voice workflows." },
      { name: "Automation", href: "/workflows", status: "Premium", icon: Activity, desc: "Connect actions, workflows, and business logic." },
    ],
  },
];

export default function AppsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ? Back to ALMA
        </Link>

        <section className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#6B7280]">ALMA Platform</p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight md:text-6xl">Your Apps</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6B7280] md:text-lg">
            ALMA is the platform. Apps are the value people use every day. AI is the premium layer unlocked only when it helps.
          </p>
        </section>

        <div className="mt-6 space-y-6">
          {appGroups.map((group) => (
            <section key={group.title} className="rounded-[2rem] border border-[#E5E7EB] bg-white p-5 shadow-sm md:p-8">
              <h2 className="text-2xl font-medium tracking-tight">{group.title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6B7280]">{group.description}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.apps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <Link key={app.name} href={app.href} className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F7F7F8] p-5 transition hover:bg-white hover:shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">{app.name}</h3>
                            <p className="mt-1 text-sm text-[#6B7280]">{app.desc}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-black px-3 py-1 text-xs text-white">{app.status}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
