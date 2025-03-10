import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin"
import { handleFeatureCreditPurchase } from "../webhook-handler"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  console.log("[WEBHOOK-SINGULAR] Received webhook request at /api/webhook")
  const sig = request.headers.get("stripe-signature") || ""
  const rawBody = await request.text()

  // Trim any whitespace from the webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  
  if (!webhookSecret) {
    console.error("[WEBHOOK-SINGULAR] Webhook secret is not defined")
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    console.log("[WEBHOOK-SINGULAR] Attempting to verify webhook signature")
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    console.log("[WEBHOOK-SINGULAR] Webhook signature verified successfully")
    console.log("[WEBHOOK-SINGULAR] Event type:", event.type)
  } catch (err: any) {
    console.error("[WEBHOOK-SINGULAR] Webhook signature verification failed:", err)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    console.log("[WEBHOOK-SINGULAR] Processing checkout.session.completed event")
    const session = event.data.object as Stripe.Checkout.Session
    console.log("[WEBHOOK-SINGULAR] Session ID:", session.id)
    console.log("[WEBHOOK-SINGULAR] Session metadata:", session.metadata)
    const customerEmail = session.customer_email

    if (!customerEmail) {
      console.error("[WEBHOOK-SINGULAR] Customer email not found in session")
      return NextResponse.json({ error: "Customer email not found" }, { status: 400 })
    }

    // Get user ID from email
    console.log("[WEBHOOK-SINGULAR] Looking up user ID for email:", customerEmail)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single()

    if (profileError || !profile?.id) {
      console.error("[WEBHOOK-SINGULAR] User not found for email:", customerEmail, "Error:", profileError)
      return NextResponse.json({ error: "User not found" }, { status: 400 })
    }

    const userId = profile.id
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0
    console.log("[WEBHOOK-SINGULAR] Amount paid:", amountPaid, "for user:", userId)

    // Check if this is a feature credit purchase (€5)
    if (amountPaid === 5 || (session.metadata && session.metadata.creditType === 'featured')) {
      console.log("[WEBHOOK-SINGULAR] Processing feature credit purchase")
      
      // Use the shared utility function to handle feature credit purchases
      const result = await handleFeatureCreditPurchase(userId, 1, session.id)
      
      if (!result.success) {
        console.error("[WEBHOOK-SINGULAR] Feature credit purchase failed:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      
      console.log("[WEBHOOK-SINGULAR] Successfully processed feature credit purchase")
      return NextResponse.json({ received: true })
    }
    // Handle event credits (€25)
    else if (amountPaid === 25) {
      console.log("[WEBHOOK-SINGULAR] Processing event credit purchase")
      
      // Check if we've already processed this session ID
      const { data: existingTransaction, error: transactionCheckError } = await supabase
        .from("credit_transactions")
        .select("id, created_at")
        .eq("stripe_payment_id", session.id)
        .eq("credit_type", "event")
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingTransaction && existingTransaction.length > 0) {
        console.log("[WEBHOOK-SINGULAR] This event credit purchase was already processed at:", existingTransaction[0].created_at)
        return NextResponse.json({ received: true })
      }

      // Add transaction record FIRST before updating credits to prevent race conditions
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          status: "completed",
          type: "credit",
          credit_type: "event",
          description: "Purchase of 1 event credit",
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }

      // Now that we've recorded the transaction, get current credits
      const { data: existingCredits, error: fetchError } = await supabase
        .from("credits_events")
        .select("amount")
        .eq("user_id", userId)
        .single()
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching event credits:", fetchError)
        return NextResponse.json({ error: "Failed to fetch event credits" }, { status: 500 })
      }
      
      const currentAmount = existingCredits?.amount || 0
      const newAmount = currentAmount + 1
      console.log("[WEBHOOK-SINGULAR] Current event credits:", currentAmount, "New amount:", newAmount)
      
      // Update credits after transaction is recorded
      const { error: upsertError } = await supabase
        .from("credits_events")
        .upsert({ 
          user_id: userId,
          amount: newAmount,
          updated_at: new Date().toISOString(),
          created_at: existingCredits ? undefined : new Date().toISOString()
        })

      if (upsertError) {
        console.error("Error updating event credits:", upsertError)
        return NextResponse.json({ error: "Error updating event credits" }, { status: 500 })
      }
      
      console.log("[WEBHOOK-SINGULAR] Successfully updated event credits to:", newAmount)
      return NextResponse.json({ received: true })
    }
    // Handle regular listing credits (€15, €50, €100)
    else if (amountPaid === 15 || amountPaid === 50 || amountPaid === 100) {
      console.log("[WEBHOOK-SINGULAR] Processing regular credit purchase")
      let creditsToAdd = 0
      if (amountPaid === 15) creditsToAdd = 1
      else if (amountPaid === 50) creditsToAdd = 10
      else if (amountPaid === 100) creditsToAdd = 20
      
      console.log("Credits to add:", creditsToAdd)
      
      // Update the credits table
      const { data: existingCredits, error: creditsError } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", userId)
        .single()

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error("Error checking credits:", creditsError)
        return NextResponse.json({ error: "Failed to check credits" }, { status: 500 })
      }

      if (existingCredits) {
        console.log("Updating existing credits record:", existingCredits.amount, "+", creditsToAdd)
        const { error: updateError } = await supabase
          .from("credits")
          .update({ 
            amount: existingCredits.amount + creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (updateError) {
          console.error("Error updating credits:", updateError)
          return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
        }
      } else {
        console.log("Creating new credits record with amount:", creditsToAdd)
        const { error: insertError } = await supabase
          .from("credits")
          .insert({
            user_id: userId,
            amount: creditsToAdd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error("Error inserting credits:", insertError)
          return NextResponse.json({ error: "Failed to create credits record" }, { status: 500 })
        }
      }
      
      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: creditsToAdd,
          status: "completed",
          type: "credit",
          credit_type: "firearms",
          description: `Purchase of ${creditsToAdd} firearms credits`,
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }
      
      console.log("Successfully processed regular credit purchase")
      return NextResponse.json({ received: true })
    }
    // Handle unknown amount
    else {
      console.log("[WEBHOOK-SINGULAR] Unrecognized amount:", amountPaid)
      return NextResponse.json({ error: "Unrecognized payment amount" }, { status: 400 })
    }
  } else {
    console.log("[WEBHOOK-SINGULAR] Ignoring non-checkout.session.completed event")
  }

  console.log("[WEBHOOK-SINGULAR] Webhook processing completed")
  return NextResponse.json({ received: true })
}