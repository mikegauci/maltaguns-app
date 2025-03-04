import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  console.log("Webhook received")
  const sig = request.headers.get("stripe-signature") || ""
  const rawBody = await request.text()

  // Trim any whitespace from the webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  
  if (!webhookSecret) {
    console.error("Webhook secret is not defined")
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    console.log("Attempting to verify webhook signature")
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    console.log("Webhook signature verified successfully")
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
    console.log("Amount paid:", amountPaid, "for user:", userId)

    // Handle different types of credits
    if (amountPaid === 25) {
      console.log("Processing event credit purchase")
      
      // First, check if the user already has event credits
      const { data: existingCredits, error: fetchError } = await supabase
        .from("credits_events")
        .select("amount")
        .eq("user_id", userId)
        .single()
        
      if (fetchError && fetchError.code !== 'PGRST116') { // Not found is ok
        console.error("Error fetching event credits:", fetchError)
        return NextResponse.json({ error: "Failed to fetch event credits" }, { status: 500 })
      }
      
      const currentAmount = existingCredits?.amount || 0
      const newAmount = currentAmount + 1
      console.log("Current event credits:", currentAmount, "New amount:", newAmount)
      
      // Now update or insert the record with the incremented amount
      const { error: upsertError } = await supabase
        .from("credits_events")
        .upsert({ 
          user_id: userId,
          amount: newAmount,
          updated_at: new Date().toISOString(),
          created_at: existingCredits ? undefined : new Date().toISOString() // Only set created_at for new records
        })

      if (upsertError) {
        console.error("Error updating event credits:", upsertError)
        return NextResponse.json({ error: "Error updating event credits" }, { status: 500 })
      }
      
      console.log("Successfully updated event credits to:", newAmount)

      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          type: "completed", // Changed from "event_credit_purchase" to "completed" for consistency
          credit_type: "event", // Added credit_type to indicate this is an event credit
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }
      
      console.log("Successfully processed event credit purchase")
    } else {
      console.log("Processing regular credit purchase")
      // Regular listing credits
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
          throw updateError
        }
      } else {
        console.log("Creating new credits record with amount:", creditsToAdd)
        const { error: insertError } = await supabase
          .from("credits")
          .insert({
            user_id: userId,
            amount: creditsToAdd
          })

        if (insertError) {
          console.error("Error inserting credits:", insertError)
          throw insertError
        }
      }
      
      // Record the transaction
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: creditsToAdd,
          type: "completed", // Changed from "listing_credit_purchase" to "completed" for consistency
          credit_type: "listing", // Added credit_type to indicate this is a listing credit
          stripe_payment_id: session.id
        })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        return NextResponse.json({ error: "Error recording transaction" }, { status: 500 })
      }
      
      console.log("Successfully processed regular credit purchase")
    }
  }

  return NextResponse.json({ received: true })
}