// /api/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json();
    console.log("Received request:", { priceId, userId });

    // Look up the user's profile using the admin client
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Profile error:", profileError);
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }
    console.log("Profile email:", profile.email);

    /*
      Map your internal price IDs from Stripe Dashboard - Products to the corresponding Stripe Price IDs and credit amounts.
    */
    const planMapping: Record<string, { stripePriceId: string; credits: number }> = {
      "price_1credit": { stripePriceId: "price_1QrHYBLT4uq5YHtWP7qIyCSq", credits: 1 },      // €15
      "price_5credits": { stripePriceId: "price_1QrJf7LT4uq5YHtWMHerJRiB", credits: 5 },     // €65
      "price_10credits": { stripePriceId: "price_1QrJgbLT4uq5YHtW7egQnVup", credits: 10 }    // €100
    };

    const plan = planMapping[priceId];
    if (!plan) {
      console.error("Invalid priceId:", priceId);
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }
    console.log("Using plan:", plan);

    // Create a new Stripe Checkout session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: profile.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/create/firearms?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
      metadata: {
        userId: userId,
        credits: plan.credits.toString(),
        priceId: priceId,
        creditType: 'firearms'
      }
    });
    console.log("Stripe session created:", session.id);

    // Record a pending credit transaction in Supabase.
    const { error: insertError } = await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: plan.credits,
      type: "pending",
      credit_type: "firearms",
      description: `Pending purchase of ${plan.credits} firearms credits`,
      stripe_payment_id: session.id,
    });

    if (insertError) {
      console.error("Error inserting credit transaction:", insertError);
      return NextResponse.json({ error: "Error recording transaction" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Error in create-checkout-session:", error.message, error);
    return NextResponse.json({ error: `Failed to create checkout session: ${error.message}` }, { status: 500 });
  }
}
