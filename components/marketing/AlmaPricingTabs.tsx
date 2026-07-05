"use client";

const plans = [
  {
    name:"Free",
    price:"$0",
    desc:"Try ALMA with basic access.",
    features:["Chat access","Basic uploads","5 Nocturai images/month","Launch Studio preview"]
  },
  {
    name:"Starter",
    price:"$20/mo",
    desc:"For creators and operators.",
    features:["More chat usage","50 Nocturai images/month","Launch Studio exports","Planner + CRM"]
  },
  {
    name:"Pro",
    price:"$40/mo",
    desc:"For serious builders.",
    features:["Highest limits","100 Nocturai images/month","Trader OS","Priority generation"]
  },
  {
    name:"Business",
    price:"Custom",
    desc:"For teams and companies.",
    features:["Team workspaces","Custom usage","Admin controls","Enterprise onboarding"]
  }
];

export default function AlmaPricingTabs() {
  return (
    <section id="pricing" className="border-t border-[#E5E7EB] bg-[#F7F7F8] px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#9CA3AF]">Pricing</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.05em] text-black md:text-6xl">
            Start small. Scale with ALMA.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan)=>(
            <div key={plan.name} className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-medium">{plan.name}</h3>
              <p className="mt-3 text-4xl tracking-tight">{plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">{plan.desc}</p>

              <div className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature)=>(
                  <div key={feature} className="rounded-2xl bg-[#F7F7F8] px-4 py-3">
                    {feature}
                  </div>
                ))}
              </div>

              <a href={plan.name === "Business" ? "/contact" : "/signup"} className="mt-6 block rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white">
                {plan.name === "Business" ? "Contact us" : "Get started"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
