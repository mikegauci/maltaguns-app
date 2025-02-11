// /api/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  // Retrieve the Stripe-Signature header.
  const sig = request.headers.get("stripe-signature") || "";
  // Get the raw body as text.
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Optionally, forward the event to an external endpoint if configured.
  const webhookEndpoint = process.env.STRIPE_WEBHOOK_ENDPOINT;
  if (webhookEndpoint) {
    try {
      await fetch(webhookEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error("Error forwarding webhook:", error);
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email;

    if (!customerEmail) {
      console.error("Customer email not found in session");
      return NextResponse.json({ error: "Customer email not found" }, { status: 400 });
    }

    // Retrieve the user by email from Supabase profiles.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (profileError || !profile?.id) {
      console.error("User not found for email:", customerEmail);
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const userId = profile.id;
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
    let creditsToAdd = 0;

    if (amountPaid === 15) creditsToAdd = 1;
    else if (amountPaid === 50) creditsToAdd = 10;
    else if (amountPaid === 100) creditsToAdd = 20;
    else {
      console.error("Invalid payment amount:", amountPaid);
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const { data: existingCredits, error: creditsError } = await supabase
      .from("credits")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (creditsError && creditsError.code !== "PGRST116") {
      console.error("Error fetching credits:", creditsError);
      return NextResponse.json({ error: "Error updating credits" }, { status: 500 });
    }

    if (existingCredits) {
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          amount: existingCredits.amount + creditsToAdd,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return NextResponse.json({ error: "Error updating credits" }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("credits")
        .insert({
          user_id: userId,
          amount: creditsToAdd,
        });

      if (insertError) {
        console.error("Error inserting credits:", insertError);
        return NextResponse.json({ error: "Error inserting credits" }, { status: 500 });
      }
    }

    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .update({ type: "completed" })
      .eq("stripe_payment_id", session.id);

    if (transactionError) {
      console.error("Error updating credit transaction:", transactionError);
      return NextResponse.json({ error: "Error updating credit transaction" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
