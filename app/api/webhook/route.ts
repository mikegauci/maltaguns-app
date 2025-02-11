import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature") || ""
  const rawBody = await request.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const customerEmail = session.customer_email

    if (!customerEmail) {
      console.error("Customer email not found in session")
      return NextResponse.json({ error: "Customer email not found" }, { status: 400 })
    }

    // Get user ID from email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single()

    if (profileError || !profile?.id) {
      console.error("User not found for email:", customerEmail)
      return NextResponse.json({ error: "User not found" }, { status: 400 })
    }

    const userId = profile.id
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0

    // Handle different types of credits
    if (amountPaid === 25) {
      // Event credit purchase
      const { error: upsertError } = await supabase
        .from("credits_events")
        .upsert({ 
          user_id: userId,
          amount: 1,
          updated_at: new Date().toISOString()
        })

      if (upsertError) {
        console.error("Error updating event credits:", upsertError)
        return NextResponse.json({ error: "Error updating event credits" }, { status: 500 })
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          type: "event_credit_purchase",
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }
    } else {
      // Regular listing credits
      const { data: existingCredits, error: creditsError } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", userId)
        .single()

      let creditsToAdd = 0
      if (amountPaid === 15) creditsToAdd = 1
      else if (amountPaid === 50) creditsToAdd = 10
      else if (amountPaid === 100) creditsToAdd = 20

      if (existingCredits) {
        const { error: updateError } = await supabase
          .from("credits")
          .update({ 
            amount: existingCredits.amount + creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("credits")
          .insert({
            user_id: userId,
            amount: creditsToAdd
          })

        if (insertError) throw insertError
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: creditsToAdd,
          type: "listing_credit_purchase",
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}