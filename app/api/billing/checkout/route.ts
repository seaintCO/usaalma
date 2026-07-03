import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getStripe } from "@/lib/stripe/server";

export async function POST(req:Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error:"Please log in first." }, { status:401 });
    }

    const body = await req.json();
    const plan = body.plan === "business" ? "business" : "personal";

    const priceId =
      plan === "business"
        ? process.env.STRIPE_PRICE_BUSINESS
        : process.env.STRIPE_PRICE_PERSONAL;

    if (!priceId) {
      return NextResponse.json({
        error:"Stripe price is not configured yet."
      }, { status:500 });
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json({
        error:"App URL is not configured yet."
      }, { status:500 });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode:"subscription",
      customer_email:user.email ?? undefined,
      line_items:[{ price:priceId, quantity:1 }],
      metadata:{ userId:user.id, plan },
      subscription_data:{ metadata:{ userId:user.id, plan } },
      success_url:`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?billing=success`,
      cancel_url:`${process.env.NEXT_PUBLIC_APP_URL}/billing?billing=cancelled`,
    });

    return NextResponse.json({ url:session.url });
  } catch {
    return NextResponse.json({
      error:"Unable to start checkout. Please try again."
    }, { status:500 });
  }
}
