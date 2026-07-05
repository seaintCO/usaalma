"use client";

import { useEffect, useState } from "react";

const steps = [
  {
    user:"Create product photos for my skincare brand.",
    alma:"I'll use Nocturai to create premium Shopify-ready visuals."
  },
  {
    user:"Build me a pitch page for investors.",
    alma:"Opening Launch Studio. I'll generate a futuristic live demo."
  },
  {
    user:"Analyze this chart for calls or puts.",
    alma:"Opening ALMA Trader. I'll check bias, key levels, risk, and invalidation."
  },
  {
    user:"What did I work on yesterday?",
    alma:"I found your Launch Studio project, Nocturai assets, and saved trade review."
  }
];

export default function AlmaReplayDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(()=>setIndex((i)=>(i + 1) % steps.length), 2600);
    return () => clearInterval(timer);
  }, []);

  const current = steps[index];

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white p-4 shadow-2xl shadow-black/5 md:p-6">
      <div className="flex border-b border-[#E5E7EB] pb-4">
        <div>
          <h3 className="text-lg font-medium">ALMA</h3>
          <p className="text-xs text-[#6B7280]">Live operating system replay</p>
        </div>
      </div>

      <div className="mt-6 min-h-[300px] space-y-4">
        <div className="ml-auto max-w-[80%] rounded-3xl bg-[#EEF4FF] px-5 py-4 text-sm text-[#1D4ED8]">
          {current.user}
        </div>

        <div className="max-w-[82%] rounded-3xl bg-[#F7F7F8] px-5 py-4 text-sm leading-6 text-[#111827]">
          <p className="font-medium">ALMA</p>
          <p className="mt-1 text-[#6B7280]">{current.alma}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-[#6B7280]">
            <span>Thinking</span>
            <span>{index + 1}/4</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div key={index} className="h-full animate-[grow_2.4s_ease-in-out] rounded-full bg-black" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grow {
          from { width: 8%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
