"use client";

import { useState } from "react";

const plans = [
  { id:"starter", name:"Starter", price:"$20/mo", desc:"For creators and small business owners.", images:"50 Nocturai images/month" },
  { id:"pro", name:"Pro", price:"$40/mo", desc:"For serious operators building with ALMA.", images:"100 Nocturai images/month" },
  { id:"business", name:"Business", price:"Custom", desc:"For teams and companies.", images:"Custom usage" },
];

export default function OnboardingPage() {
  const [loading, setLoading] = useState("");

  async function checkout(plan:string) {
    setLoading(plan);

    const res = await fetch("/api/billing/checkout", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (data.url) window.location.assign(data.url);
    else {
      setLoading("");
      alert(data.error || "Could not start checkout.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#9CA3AF]">Welcome to ALMA</p>
          <h1 className="mt-4 text-5xl font-normal tracking-tight md:text-7xl">Choose your operating system.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[#6B7280]">
            Chat, files, Nocturai, Launch Studio, automations, and business memory in one autonomous AI workspace.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan)=>(
            <div key={plan.id} className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-medium">{plan.name}</h2>
              <p className="mt-2 text-4xl tracking-tight">{plan.price}</p>
              <p className="mt-3 text-sm text-[#6B7280]">{plan.desc}</p>
              <div className="mt-5 rounded-2xl bg-[#F7F7F8] p-4 text-sm">{plan.images}</div>
              <button onClick={()=>checkout(plan.id)} disabled={Boolean(loading)} className="mt-6 w-full rounded-full bg-black py-3 text-sm font-medium text-white disabled:opacity-50">
                {loading === plan.id ? "Opening Stripe..." : plan.id === "business" ? "Continue" : "Start"}
              </button>
            </div>
          ))}
        </div>

        <a href="/dashboard" className="mx-auto mt-8 block text-center text-sm text-[#6B7280] hover:text-black">
          Continue with free beta access
        </a>
      </div>
    </main>
  );
}
