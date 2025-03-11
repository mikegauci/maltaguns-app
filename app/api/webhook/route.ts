import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  console.log('[WEBHOOK-SINGULAR] Received webhook request');
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    console.log('[WEBHOOK-SINGULAR] Webhook signature:', signature.substring(0, 10) + '...');

    let event: Stripe.Event;

    try {
      console.log('[WEBHOOK-SINGULAR] Attempting to verify webhook signature');
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );
      console.log('[WEBHOOK-SINGULAR] Signature verified, event type:', event.type);
    } catch (err: any) {
      console.error(`[WEBHOOK-SINGULAR] Signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      console.log('[WEBHOOK-SINGULAR] Processing checkout.session.completed event');
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[WEBHOOK-SINGULAR] Session ID:', session.id);
      console.log('[WEBHOOK-SINGULAR] Session metadata:', session.metadata);
      
      // Extract userId and listingId from session metadata
      const userId = session.metadata?.userId;
      const listingId = session.metadata?.listingId;

      if (!userId || !listingId) {
        console.error('[WEBHOOK-SINGULAR] Missing userId or listingId in metadata');
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }
      
      console.log('[WEBHOOK-SINGULAR] Processing for userId:', userId, 'listingId:', listingId);

      // Create a Supabase client
      console.log('[WEBHOOK-SINGULAR] Creating Supabase client');
      const supabase = createRouteHandlerClient({ cookies });
      
      try {
        // First, check the listing details to get current expiry
        console.log('[WEBHOOK-SINGULAR] Checking listing details');
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('expires_at, type')
          .eq('id', listingId)
          .single();
          
        if (listingError) {
          console.error('[WEBHOOK-SINGULAR] Error fetching listing details:', listingError);
          return NextResponse.json(
            { error: 'Error fetching listing details' },
            { status: 500 }
          );
        }
        
        console.log('[WEBHOOK-SINGULAR] Listing details:', listingData);

        // Update the transaction status to completed
        console.log('[WEBHOOK-SINGULAR] Updating transaction status to completed');
        const { data: txData, error: transactionError } = await supabase
          .from('credit_transactions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_id', session.id)
          .eq('user_id', userId)
          .eq('credit_type', 'featured')
          .eq('status', 'pending')
          .select();

        if (transactionError) {
          console.error('[WEBHOOK-SINGULAR] Error updating transaction:', transactionError);
          // Continue anyway, not critical
        } else {
          console.log('[WEBHOOK-SINGULAR] Transaction updated successfully:', txData);
        }

        // Check for existing featured listing
        console.log('[WEBHOOK-SINGULAR] Checking for existing featured listing');
        const { data: existingFeature, error: featureError } = await supabase
          .from('featured_listings')
          .select('*')
          .eq('listing_id', listingId)
          .gt('end_date', new Date().toISOString())
          .order('end_date', { ascending: false })
          .limit(1);

        if (featureError) {
          console.error('[WEBHOOK-SINGULAR] Error checking for existing feature:', featureError);
          return NextResponse.json(
            { error: 'Error checking existing feature' },
            { status: 500 }
          );
        }

        console.log('[WEBHOOK-SINGULAR] Existing feature check result:', existingFeature);
        
        // Always set start date to now and end date to 15 days from now
        // This ensures a consistent 15-day feature period regardless of any existing period
        const startDate = new Date().toISOString();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 15);
        const endDateIso = endDate.toISOString();
        
        console.log('[WEBHOOK-SINGULAR] New feature period:', startDate, 'to', endDateIso);

        // Check if listing is expiring soon (less than 15 days)
        const currentExpiryDate = new Date(listingData.expires_at);
        const now = new Date();
        const daysUntilExpiry = Math.floor((currentExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('[WEBHOOK-SINGULAR] Days until listing expiry:', daysUntilExpiry);
        
        // Calculate new expiry date for listing if needed
        let newExpiryDate = null;
        if (daysUntilExpiry < 15) {
          console.log('[WEBHOOK-SINGULAR] Listing is expiring soon, will extend to 30 days');
          newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        }

        if (existingFeature && existingFeature.length > 0) {
          // If there's an existing feature, update its dates
          const feature = existingFeature[0];
          console.log('[WEBHOOK-SINGULAR] Found existing feature. Will update to fixed 15-day period');
          
          // Update the existing featured listing with new dates
          console.log('[WEBHOOK-SINGULAR] Updating existing featured listing');
          const { data: updateData, error: updateError } = await supabase
            .from('featured_listings')
            .update({
              start_date: startDate,
              end_date: endDateIso,
              updated_at: new Date().toISOString()
            })
            .eq('id', feature.id)
            .select();
          
          if (updateError) {
            console.error('[WEBHOOK-SINGULAR] Error updating feature:', updateError);
            return NextResponse.json(
              { error: 'Error updating feature' },
              { status: 500 }
            );
          }
          
          console.log(`[WEBHOOK-SINGULAR] Reset feature for listing ${listingId} to new 15-day period`, updateData);
        } else {
          // Create new feature
          console.log('[WEBHOOK-SINGULAR] No existing feature found, creating new one');
          
          // Insert new featured listing
          console.log('[WEBHOOK-SINGULAR] Inserting new featured listing');
          const { data: insertData, error: insertError } = await supabase
            .from('featured_listings')
            .insert({
              listing_id: listingId,
              user_id: userId,
              start_date: startDate,
              end_date: endDateIso
            })
            .select();
          
          if (insertError) {
            console.error('[WEBHOOK-SINGULAR] Error creating feature:', insertError);
            return NextResponse.json(
              { error: 'Error creating feature' },
              { status: 500 }
            );
          }
          
          console.log(`[WEBHOOK-SINGULAR] Created new feature for listing ${listingId}:`, insertData);
        }

        // Update the listing
        const listingUpdateData: any = {
          featured_until: endDateIso
        };
        
        // Add the new expires_at if needed
        if (newExpiryDate) {
          listingUpdateData.expires_at = newExpiryDate.toISOString();
        }
        
        console.log('[WEBHOOK-SINGULAR] Updating listing with:', listingUpdateData);
        const { error: listingUpdateError } = await supabase
          .from('listings')
          .update(listingUpdateData)
          .eq('id', listingId);
          
        if (listingUpdateError) {
          console.error('[WEBHOOK-SINGULAR] Error updating listing:', listingUpdateError);
          // Not critical, continue
        } else {
          const updateMessage = newExpiryDate 
            ? `Listing featured_until and expires_at updated successfully. New expiry: ${newExpiryDate.toISOString()}` 
            : 'Listing featured_until updated successfully';
          console.log(`[WEBHOOK-SINGULAR] ${updateMessage}`);
        }

        console.log('[WEBHOOK-SINGULAR] Webhook processing completed successfully');
        return NextResponse.json({ 
          success: true,
          feature_start: startDate,
          feature_end: endDateIso,
          listing_expiry: newExpiryDate ? newExpiryDate.toISOString() : listingData.expires_at
        });
      } catch (error) {
        console.error('[WEBHOOK-SINGULAR] Unexpected error processing webhook:', error);
        return NextResponse.json(
          { error: 'Unexpected error processing webhook' },
          { status: 500 }
        );
      }
    }

    console.log('[WEBHOOK-SINGULAR] Event type not handled:', event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK-SINGULAR] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
} 