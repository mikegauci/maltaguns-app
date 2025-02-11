import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = headers().get("stripe-signature")!

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    if (event.type === "payment_link.completed" as string) {
      const session = event.data.object as Stripe.Checkout.Session
      const customerEmail = session.customer_details?.email

      if (!customerEmail) {
        throw new Error("Customer email not found")
      }

      // Get user ID from email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customerEmail)
        .single()

      if (profileError || !profile?.id) {
        throw new Error("User not found")
      }

      const userId = profile.id

      // Determine credits based on amount paid
      const amountPaid = session.amount_total! / 100 // Convert from cents to euros
      let creditsToAdd = 0

      if (amountPaid === 10) creditsToAdd = 1
      else if (amountPaid === 50) creditsToAdd = 10
      else if (amountPaid === 100) creditsToAdd = 20
      else throw new Error("Invalid payment amount")

      // Update or create credits record
      const { data: existingCredits, error: creditsError } = await supabase
        .from("credits")
        .select("amount")
        .eq("user_id", userId)
        .single()

      if (creditsError && creditsError.code !== "PGRST116") {
        throw creditsError
      }

      if (existingCredits) {
        // Update existing credits
        const { error: updateError } = await supabase
          .from("credits")
          .update({ 
            amount: existingCredits.amount + creditsToAdd,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (updateError) throw updateError
      } else {
        // Insert new credits record
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
          type: "purchase",
          stripe_payment_id: session.payment_intent as string
        })

      if (transactionError) throw transactionError
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    )
  }
}