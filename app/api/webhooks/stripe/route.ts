import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  console.log("[WEBHOOK] Received webhook request at /api/webhooks/stripe");
  
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    if (!webhookSecret) {
      console.error("[WEBHOOK] Missing Stripe webhook secret");
      throw new Error("Missing Stripe webhook secret");
    }
    
    console.log("[WEBHOOK] Attempting to verify webhook signature");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("[WEBHOOK] Webhook signature verified successfully");
    console.log("[WEBHOOK] Event type:", event.type);
  } catch (err: any) {
    console.error(`[WEBHOOK] Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    console.log("[WEBHOOK] Processing checkout.session.completed event");
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[WEBHOOK] Session ID:", session.id);
    console.log("[WEBHOOK] Session metadata:", session.metadata);
    
    // Extract metadata
    const userId = session.metadata?.userId;
    const listingId = session.metadata?.listingId;
    
    console.log("[WEBHOOK] Extracted data - userId:", userId, "listingId:", listingId);
    
    if (userId && listingId) {
      console.log("[WEBHOOK] Processing feature purchase for listing:", listingId);
      try {
        // Calculate start and end dates for the feature period
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 days from now
        
        // Insert into featured_listings table
        const { data: featuredData, error: featuredError } = await supabaseAdmin
          .from("featured_listings")
          .insert({
            listing_id: listingId,
            user_id: userId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
          .select();

        if (featuredError) {
          console.error("[WEBHOOK] Error featuring listing:", featuredError);
          return new NextResponse("Error featuring listing", { status: 500 });
        }
        
        console.log("[WEBHOOK] Successfully featured listing:", featuredData);
        
        // Record the transaction
        const { error: transactionError } = await supabaseAdmin
          .from("credit_transactions")
          .insert({
            user_id: userId,
            amount: 1,
            credit_type: "featured",
            status: "completed",
            description: `Featured listing ${listingId} for 30 days`,
            stripe_payment_id: session.id,
            type: "debit"
          });

        if (transactionError) {
          console.error("[WEBHOOK] Error recording transaction:", transactionError);
          // Non-critical error, continue anyway
        }
        
        console.log("[WEBHOOK] Listing feature purchase processed successfully");
        return new NextResponse("Listing featured successfully", { status: 200 });
      } catch (error) {
        console.error("[WEBHOOK] Error processing webhook:", error);
        return new NextResponse("Error processing webhook", { status: 500 });
      }
    } else {
      console.log("[WEBHOOK] Missing userId or listingId in metadata");
    }
  } else {
    console.log("[WEBHOOK] Ignoring non-checkout.session.completed event");
  }

  console.log("[WEBHOOK] Webhook processing completed");
  return new NextResponse("Received", { status: 200 });
} 