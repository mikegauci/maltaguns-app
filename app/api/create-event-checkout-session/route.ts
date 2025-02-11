import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    // Look up the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1QrLQgLT4uq5YHtWJ3bzhwEC', // Replace with actual Stripe price ID for event credits
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: profile.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events`,
    });

    // Record the pending transaction
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: 1,
        type: "event_credit_pending",
        stripe_payment_id: session.id,
      });

    if (transactionError) {
      return NextResponse.json({ error: "Error recording transaction" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error.message}` },
      { status: 500 }
    );
  }
}