import { getPremiumLibrary } from "@/lib/launch-studio/design-system/premiumSections";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const starterComponents = [
  {
    id:"hero-glass",
    name:"Glass Hero",
    category:"hero",
    component:{ type:"hero", eyebrow:"PREMIUM DEMO", headline:"Launch faster with AI.", subheadline:"A cinematic hero section for SaaS demos.", bullets:["Fast","Premium","Vercel-ready"] }
  },
  {
    id:"metrics-grid",
    name:"Metrics Grid",
    category:"stats",
    component:{ type:"stats", title:"Proof in numbers.", stats:[["Speed","3 min"],["Export","Next.js"],["Deploy","Vercel"],["Quality","Premium"]] }
  },
  {
    id:"dashboard-table",
    name:"Live Dashboard",
    category:"mock_dashboard",
    component:{ type:"mock_dashboard", title:"Live Product Preview", rows:[["Revenue","Metric","Live","+42%"],["Users","Growth","Active","+88%"],["Pipeline","CRM","Online","+21%"]] }
  },
  {
    id:"pricing-trio",
    name:"Pricing Trio",
    category:"pricing",
    component:{ type:"pricing", title:"Choose your plan.", plans:[{name:"Starter",price:"$29",features:["Demo","Export","Share"]},{name:"Pro",price:"$99",features:["AI edits","Next ZIP","Versions"]},{name:"Scale",price:"Custom",features:["Team","Brand kit","Support"]}] }
  }
];

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("launch_studio_components")
    .select("*")
    .or(`is_public.eq.true${user ? `,user_id.eq.${user.id}` : ""}`)
    .order("created_at", { ascending:false });

  return NextResponse.json({ components:[...starterComponents, ...getPremiumLibrary(), ...(data || [])] });
}

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { name, category, component, isPublic } = await req.json();

  const { data, error } = await supabase
    .from("launch_studio_components")
    .insert({ user_id:user.id, name, category, component, is_public:Boolean(isPublic) })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ component:data });
}


