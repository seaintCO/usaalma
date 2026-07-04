import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { generatePresentationDeck } from "@/lib/presentations/generateDeck";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  const subscription = await SubscriptionRepository.get(user.id);
  const active = subscription && ["active", "trialing"].includes(subscription.status);

  if (!active && process.env.NEXT_PUBLIC_BETA_MODE !== "true") {
    return NextResponse.json({
      error:"Presentations are a paid ALMA feature. Upgrade to unlock."
    }, { status:402 });
  }

  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error:"Missing prompt" }, { status:400 });
  }

  const deck = await generatePresentationDeck(prompt);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("presentations")
    .insert({
      user_id:user.id,
      title:deck.title ?? "Untitled Presentation",
      prompt,
      deck
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error:error.message }, { status:500 });
  }

  return NextResponse.json({ presentation:data });
}
