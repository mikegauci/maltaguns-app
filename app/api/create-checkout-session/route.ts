import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      )
    }

    // Map price IDs to actual Stripe price IDs
    let stripePriceId: string
    switch (priceId) {
      case "price_1credit":
        stripePriceId = "price_1credit" // Replace with actual Stripe price ID
        break
      case "price_10credits":
        stripePriceId = "price_10credits" // Replace with actual Stripe price ID
        break
      case "price_20credits":
        stripePriceId = "price_20credits" // Replace with actual Stripe price ID
        break
      default:
        return NextResponse.json(
          { error: "Invalid price ID" },
          { status: 400 }
        )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/create/firearms?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/create/firearms`,
      customer_email: profile.email,
      metadata: {
        userId,
        priceId, // Store our internal price ID
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Checkout session error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}