import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// This should be your actual price ID from Stripe dashboard
const FEATURE_LISTING_PRICE_ID = "price_1REOokPnR92CMKYG8MYTHKnM";

// Helper function to generate a slug from a string
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export async function POST(request: Request) {
  console.log('[CHECKOUT] Starting checkout process');
  try {
    const { userId, listingId } = await request.json();
    console.log('[CHECKOUT] Request data:', { userId, listingId });
    
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user exists and get their profile
    console.log('[CHECKOUT] Verifying user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error("[CHECKOUT] Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    
    console.log('[CHECKOUT] Found user profile:', profile.email);

    // Get the listing details for metadata
    console.log('[CHECKOUT] Fetching listing details');
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      console.error("[CHECKOUT] Listing fetch error:", listingError);
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }
    
    console.log('[CHECKOUT] Found listing:', listing.title);

    // Create success URL with listing slug
    const slug = slugify(listing.title);
    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${hostUrl}/marketplace/listing/${slug}?success=true&listingId=${listingId}`;
    const cancelUrl = `${hostUrl}/marketplace/listing/${slug}?canceled=true`;
    
    console.log('[CHECKOUT] URLs:', { successUrl, cancelUrl });
      
    // Create Stripe checkout session
    console.log('[CHECKOUT] Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: FEATURE_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: profile.email,
      metadata: {
        userId: userId,
        listingId: listingId,
      },
    });
    
    console.log('[CHECKOUT] Stripe session created:', session.id);

    // Pre-create a transaction record with pending status
    console.log('[CHECKOUT] Creating transaction record');
    const { data: txData, error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: 1,
        status: "pending",
        credit_type: "featured",
        description: `Feature listing purchase for listing ${listingId}`,
        stripe_payment_id: session.id,
        type: "debit"
      })
      .select();
      
    if (transactionError) {
      console.error("[CHECKOUT] Error creating transaction record:", transactionError);
      // Continue anyway as this is not critical
    } else {
      console.log('[CHECKOUT] Transaction record created:', txData);
    }
    
    console.log('[CHECKOUT] Redirecting to Stripe checkout:', session.url);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[CHECKOUT] Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
} 