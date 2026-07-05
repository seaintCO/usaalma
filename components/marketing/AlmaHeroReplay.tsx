"use client";

import { useEffect, useState } from "react";

const scenarios:any = {
  chat: {
    label:"Chat",
    nav:"Nuevo Chat",
    user:"Help me organize my business today.",
    alma:"I found your planner, CRM follow-ups, recent files, and open projects.",
    module:"Chat",
    action:"Answering with memory"
  },
  nocturai: {
    label:"Nocturai",
    nav:"Creative Studio",
    user:"Create premium product photos for my brand.",
    alma:"Opening ALMA Nocturai. I will write the prompt, preserve the product, and generate ad-ready images.",
    module:"Nocturai",
    action:"Generating creative assets"
  },
  trader: {
    label:"Trader",
    nav:"ALMA Trader",
    user:"Analyze SPY for calls or puts.",
    alma:"Opening ALMA Trader. I am checking bias, VWAP, liquidity, invalidation, and risk.",
    module:"Trader",
    action:"Reading chart structure"
  },
  launch: {
    label:"Launch Studio",
    nav:"Launch Studio",
    user:"Build me a futuristic investor demo.",
    alma:"Opening Launch Studio. I will create a motion HTML presentation ready for Vercel.",
    module:"Launch Studio",
    action:"Building live demo"
  },
  planner: {
    label:"Planner",
    nav:"Planner",
    user:"Plan my day and add my trade review.",
    alma:"Opening Planner. I will organize meetings, trade notes, reminders, and priorities.",
    module:"Planner",
    action:"Updating calendar"
  },
};

const keys = Object.keys(scenarios);

export default function AlmaHeroReplay() {
  const [active, setActive] = useState("chat");
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => {
        const next = keys[(keys.indexOf(current) + 1) % keys.length];
        setProgressKey((k)=>k + 1);
        return next;
      });
    }, 5200);

    return () => clearInterval(timer);
  }, []);

  const current = scenarios[active];

  function choose(id:string) {
    setActive(id);
    setProgressKey((k)=>k + 1);
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-90px)] max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#9CA3AF]">ALMA OS</p>
        <h1 className="mt-5 text-5xl font-normal tracking-[-0.07em] text-black md:text-7xl lg:text-8xl">
          Your AI operating system.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280]">
          Chat, create, trade, build, plan, automate, and remember everything in one intelligent workspace.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/signup" className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white">
            Create my ALMA
          </a>
          <a href="#pricing" className="rounded-full border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-medium text-black">
            View pricing
          </a>
        </div>
      </div>

      <div className="sticky top-24 transition-all duration-700 md:scale-[1.02]">
        <div className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <div>
              <h3 className="text-lg font-medium">ALMA</h3>
              <p className="text-xs text-[#6B7280]">Live operating system replay</p>
            </div>
            <div className="hidden rounded-full bg-[#F7F7F8] px-4 py-2 text-xs text-[#6B7280] md:block">
              {current.action}
            </div>
          </div>

          <div className="grid min-h-[430px] md:grid-cols-[210px_1fr]">
            <aside className="hidden border-r border-[#E5E7EB] bg-[#F7F7F8] p-4 md:block">
              {["Nuevo Chat","Nocturai","ALMA Trader","Launch Studio","Planner","CRM"].map((item)=>(
                <div
                  key={item}
                  className={`mb-2 rounded-xl px-3 py-2 text-sm ${
                    item === current.nav || item === current.module ? "bg-white text-black shadow-sm" : "text-[#6B7280]"
                  }`}
                >
                  {item}
                </div>
              ))}
            </aside>

            <main className="relative p-5">
              <div className="absolute left-8 top-8 z-10 hidden h-8 w-8 rounded-full bg-black shadow-xl shadow-black/30 transition-all duration-700 md:block"
                style={{
                  transform:
                    active === "chat" ? "translate(70px, 255px)" :
                    active === "nocturai" ? "translate(-195px, 80px)" :
                    active === "trader" ? "translate(-195px, 122px)" :
                    active === "launch" ? "translate(-195px, 166px)" :
                    "translate(-195px, 210px)"
                }}
              />

              <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#9CA3AF]">{current.module}</p>
                    <h4 className="mt-1 text-2xl font-medium tracking-tight">{current.action}</h4>
                  </div>
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                </div>

                <div className="space-y-4">
                  <div className="ml-auto max-w-[82%] rounded-3xl bg-[#EEF4FF] px-5 py-4 text-sm text-[#1D4ED8]">
                    {current.user}
                  </div>

                  <div className="max-w-[86%] rounded-3xl bg-white px-5 py-4 text-sm leading-6 text-[#111827] shadow-sm">
                    <p className="font-medium">ALMA</p>
                    <p className="mt-1 text-[#6B7280]">{current.alma}</p>
                  </div>

                  <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between text-xs text-[#6B7280]">
                      <span>Thinking</span>
                      <span>{keys.indexOf(active) + 1}/5</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div key={progressKey} className="h-full animate-[grow_5s_ease-in-out] rounded-full bg-black" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <p className="text-[#9CA3AF]">Module</p>
                      <p className="mt-1 font-medium">{current.module}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <p className="text-[#9CA3AF]">Memory</p>
                      <p className="mt-1 font-medium">Connected</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
                      <p className="text-[#9CA3AF]">Status</p>
                      <p className="mt-1 font-medium">Working</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {keys.map((id)=>(
                  <button
                    key={id}
                    onClick={()=>choose(id)}
                    className={`rounded-full px-4 py-2 text-xs font-medium ${
                      active === id ? "bg-black text-white" : "bg-[#F7F7F8] text-[#6B7280]"
                    }`}
                  >
                    {scenarios[id].label}
                  </button>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grow {
          from { width: 5%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}
