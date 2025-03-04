import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { handleFeatureCreditPurchase } from "../../webhook-handler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

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
    const creditType = session.metadata?.creditType;
    const amount = session.metadata?.amount ? parseInt(session.metadata.amount) : 1;
    
    console.log("[WEBHOOK] Extracted data - userId:", userId, "creditType:", creditType, "amount:", amount);
    
    if (userId && creditType === "featured") {
      console.log("[WEBHOOK] Processing feature credit purchase");
      try {
        const result = await handleFeatureCreditPurchase(userId, amount, session.id);
        
        if (!result.success) {
          console.error("[WEBHOOK] Feature credit purchase failed:", result.error);
          return new NextResponse(result.error || "Error processing feature credit purchase", { status: 500 });
        }
        
        console.log("[WEBHOOK] Feature credit purchase successful");
        return new NextResponse("Credits added successfully", { status: 200 });
      } catch (error) {
        console.error("[WEBHOOK] Error processing webhook:", error);
        return new NextResponse("Error processing webhook", { status: 500 });
      }
    } else {
      console.log("[WEBHOOK] Not a feature credit purchase or missing userId");
    }
  } else {
    console.log("[WEBHOOK] Ignoring non-checkout.session.completed event");
  }

  console.log("[WEBHOOK] Webhook processing completed");
  return new NextResponse("Received", { status: 200 });
} 