import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Price ID for featured listing
const FEATURE_LISTING_PRICE_ID = "price_1QydHBLT4uq5YHtWYofw182m";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    console.log("[CHECKOUT] Creating feature credit checkout session for user:", userId);

    // Verify that the user exists in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[CHECKOUT] Error verifying user:", profileError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    console.log("[CHECKOUT] User verified:", profile);

    // Create Stripe checkout session
    console.log("[CHECKOUT] Creating Stripe checkout session");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: FEATURE_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?canceled=true`,
      customer_email: profile.email, // Add customer email for better identification
      metadata: {
        userId: userId,
        creditType: "featured",
        amount: 1,
      },
    });

    console.log("[CHECKOUT] Checkout session created:", session.id);
    
    // Pre-create a transaction record with pending status
    console.log("[CHECKOUT] Creating pending transaction record");
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: 1,
        status: "pending",
        credit_type: "featured",
        description: "Purchase of 1 feature credit",
        stripe_payment_id: session.id
      });
      
    if (transactionError) {
      console.error("[CHECKOUT] Error creating transaction record:", transactionError);
      // Continue anyway as this is not critical
    } else {
      console.log("[CHECKOUT] Pending transaction record created");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[CHECKOUT] Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
} 