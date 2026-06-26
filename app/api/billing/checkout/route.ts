import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getStripe } from "@/lib/stripe/server";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();
  const plan = body.plan;

  const price =
    plan === "business"
      ? process.env.STRIPE_PRICE_BUSINESS
      : process.env.STRIPE_PRICE_PERSONAL;

  if (!price) return NextResponse.json({ error:"Missing Stripe price" }, { status:500 });

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode:"subscription",
    payment_method_types:["card"],
    customer_email:user.email ?? undefined,
    line_items:[
      {
        price,
        quantity:1,
      },
    ],
    metadata:{
      userId:user.id,
      plan,
    },
    subscription_data:{
      metadata:{
        userId:user.id,
        plan,
      },
    },
    success_url:`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?billing=success`,
    cancel_url:`${process.env.NEXT_PUBLIC_APP_URL}/billing?billing=cancelled`,
  });

  return NextResponse.json({ url:session.url });
}
