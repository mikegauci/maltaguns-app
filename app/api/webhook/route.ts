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
    console.log("[WEBHOOK-SINGULAR] Full session data:", JSON.stringify(session, null, 2))
    console.log("[WEBHOOK-SINGULAR] Session ID:", session.id)
    console.log("[WEBHOOK-SINGULAR] Session metadata:", session.metadata)
    console.log("[WEBHOOK-SINGULAR] Amount total:", session.amount_total)
    console.log("[WEBHOOK-SINGULAR] Line items:", session.line_items)
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
      
      // First check if we've already processed this transaction
      const { data: existingTransaction } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("stripe_payment_id", session.id)
        .eq("credit_type", "event")
        .single()

      if (existingTransaction) {
        console.log("[WEBHOOK-SINGULAR] This event credit purchase was already processed")
        return NextResponse.json({ received: true })
      }

      // Start transaction by getting current credits with FOR UPDATE lock
      const { data: existingCredits, error: fetchError } = await supabase
        .from("credits_events")
        .select("amount")
        .eq("user_id", userId)
        .single()
        
      const currentAmount = existingCredits?.amount || 0
      
      // Create transaction record first
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

      // Now update credits
      const { error: creditError } = await supabase
        .from("credits_events")
        .upsert({
          user_id: userId,
          amount: currentAmount + 1,
          updated_at: new Date().toISOString(),
          created_at: existingCredits ? undefined : new Date().toISOString()
        })

      if (creditError) {
        console.error("Error updating credits:", creditError)
        // Try to rollback by deleting the transaction
        await supabase
          .from("credit_transactions")
          .delete()
          .eq("stripe_payment_id", session.id)
        return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
      }

      console.log("[WEBHOOK-SINGULAR] Successfully processed event credit purchase. New amount:", currentAmount + 1)
      return NextResponse.json({ received: true })
    }
    // Handle regular listing credits (€15, €65, €100)
    else if (amountPaid === 15 || amountPaid === 65 || amountPaid === 100) {
      console.log("[WEBHOOK-SINGULAR] Processing regular credit purchase. Amount paid:", amountPaid)
      console.log("[WEBHOOK-SINGULAR] Session metadata:", session.metadata)
      
      // Get credits from metadata - this is the source of truth
      const creditsToAdd = session.metadata?.credits ? parseInt(session.metadata.credits) : 0
      if (!creditsToAdd) {
        console.error("[WEBHOOK-SINGULAR] No credits specified in metadata")
        return NextResponse.json({ error: "No credits specified in metadata" }, { status: 400 })
      }
      console.log("[WEBHOOK-SINGULAR] Credits to add from metadata:", creditsToAdd)

      // First check if we've already processed this transaction - check both pending and completed
      const { data: existingTransactions, error: txError } = await supabase
        .from("credit_transactions")
        .select("id, status, amount")
        .eq("stripe_payment_id", session.id)
        .eq("credit_type", "firearms")

      if (txError) {
        console.error("[WEBHOOK-SINGULAR] Error checking existing transactions:", txError)
        return NextResponse.json({ error: "Failed to check existing transactions" }, { status: 500 })
      }

      console.log("[WEBHOOK-SINGULAR] Found existing transactions:", existingTransactions)

      // If there's a completed transaction with the correct amount, we're done
      if (existingTransactions && existingTransactions.length > 0) {
        const completedTx = existingTransactions.find(tx => tx.status === "completed" && tx.amount === creditsToAdd)
        if (completedTx) {
          console.log("[WEBHOOK-SINGULAR] Found completed transaction with correct amount:", completedTx)
          return NextResponse.json({ received: true })
        }

        // If there's a completed transaction with wrong amount, log error
        const wrongAmountTx = existingTransactions.find(tx => tx.status === "completed" && tx.amount !== creditsToAdd)
        if (wrongAmountTx) {
          console.error("[WEBHOOK-SINGULAR] Found completed transaction with wrong amount:", wrongAmountTx)
          return NextResponse.json({ error: "Transaction already processed with different amount" }, { status: 400 })
        }
      }
      
      // Get current credits first
      const { data: existingCredits, error: creditsError } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", userId)
        .single()

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error("[WEBHOOK-SINGULAR] Error checking credits:", creditsError)
        return NextResponse.json({ error: "Failed to check credits" }, { status: 500 })
      }

      const currentAmount = existingCredits?.amount || 0
      console.log("[WEBHOOK-SINGULAR] Current credit amount:", currentAmount)

      // Handle existing transactions
      if (existingTransactions && existingTransactions.length > 0) {
        // Find pending transaction
        const pendingTx = existingTransactions.find(tx => tx.status === "pending" || tx.status === null)
        if (pendingTx) {
          console.log("[WEBHOOK-SINGULAR] Updating pending transaction to completed with correct amount")
          
          // First update the transaction
          const { error: updateError } = await supabase
            .from("credit_transactions")
            .update({ 
              status: "completed",
              amount: creditsToAdd,
              description: `Purchase of ${creditsToAdd} firearms credits (€${amountPaid} package)`
            })
            .eq("id", pendingTx.id)

          if (updateError) {
            console.error("[WEBHOOK-SINGULAR] Error updating pending transaction:", updateError)
            return NextResponse.json({ error: "Failed to update pending transaction" }, { status: 500 })
          }

          // Now update credits using UPDATE instead of UPSERT to avoid unique constraint error
          const { error: creditError } = await supabase
            .from("credits")
            .update({
              amount: currentAmount + creditsToAdd,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)

          if (creditError) {
            console.error("[WEBHOOK-SINGULAR] Error updating credits:", creditError)
            // Try to rollback by marking transaction as failed
            await supabase
              .from("credit_transactions")
              .update({ status: "failed" })
              .eq("id", pendingTx.id)
            return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
          }

          const newAmount = currentAmount + creditsToAdd
          console.log("[WEBHOOK-SINGULAR] Successfully processed firearms credit purchase:")
          console.log("- Package: €" + amountPaid)
          console.log("- Previous amount:", currentAmount)
          console.log("- Credits added:", creditsToAdd)
          console.log("- New amount:", newAmount)
          return NextResponse.json({ received: true })
        }
      }

      // If no pending transaction exists, create a new one and update credits
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: creditsToAdd,
          status: "completed",
          type: "credit",
          credit_type: "firearms",
          description: `Purchase of ${creditsToAdd} firearms credits (€${amountPaid} package)`,
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("[WEBHOOK-SINGULAR] Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }

      // Update credits using UPDATE instead of UPSERT
      const { error: creditError } = await supabase
        .from("credits")
        .update({
          amount: currentAmount + creditsToAdd,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)

      if (creditError) {
        console.error("[WEBHOOK-SINGULAR] Error updating credits:", creditError)
        // Try to rollback by deleting the transaction
        await supabase
          .from("credit_transactions")
          .delete()
          .eq("stripe_payment_id", session.id)
        return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
      }

      const newAmount = currentAmount + creditsToAdd
      console.log("[WEBHOOK-SINGULAR] Successfully processed firearms credit purchase:")
      console.log("- Package: €" + amountPaid)
      console.log("- Previous amount:", currentAmount)
      console.log("- Credits added:", creditsToAdd)
      console.log("- New amount:", newAmount)
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