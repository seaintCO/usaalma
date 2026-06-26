import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

export async function GET(){

    const user = await getCurrentUser();

    if(!user)
        return NextResponse.json({error:"Unauthorized"},{status:401});

    const subscription =
        await SubscriptionRepository.get(user.id);

    return NextResponse.json(
        subscription ?? {
            plan:"free",
            status:"inactive"
        }
    );

}
