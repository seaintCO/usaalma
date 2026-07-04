import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  const checklist = {
    emaAlignment: body.emaAlignment || false,
    vwapReclaim: body.vwapReclaim || false,
    volumeConfirmation: body.volumeConfirmation || false,
    liquiditySweep: body.liquiditySweep || false,
    riskDefined: body.riskDefined || false,
  };

  const { data, error } = await supabase
    .from("trader_setups")
    .insert({
      user_id:user.id,
      symbol:body.symbol,
      setup_type:body.setupType,
      timeframe:body.timeframe,
      checklist,
      levels:body.levels || {},
      analysis:body.analysis || "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ setup:data });
}
