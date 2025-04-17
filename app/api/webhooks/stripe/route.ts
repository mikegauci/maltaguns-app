import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
  console.log('[WEBHOOK-PLURAL] Received webhook request');
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    console.log('[WEBHOOK-PLURAL] Webhook signature:', signature.substring(0, 10) + '...');

    let event: Stripe.Event;

    try {
      console.log('[WEBHOOK-PLURAL] Attempting to verify webhook signature');
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );
      console.log('[WEBHOOK-PLURAL] Signature verified, event type:', event.type);
    } catch (err: any) {
      console.error(`[WEBHOOK-PLURAL] Signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      console.log('[WEBHOOK-PLURAL] Processing checkout.session.completed event');
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[WEBHOOK-PLURAL] Session ID:', session.id);
      console.log('[WEBHOOK-PLURAL] Session metadata:', session.metadata);
      console.log('[WEBHOOK-PLURAL] Event ID:', event.id);
      
      // Global idempotency check - check if we've already processed this payment
      try {
        const { data: existingCompletedTx, error: txCheckError } = await supabaseAdmin
          .from('credit_transactions')
          .select('*')
          .eq('stripe_payment_id', session.id)
          .eq('status', 'completed')
          .limit(1);
          
        if (txCheckError) {
          console.error('[WEBHOOK-PLURAL] Error checking completed transactions:', txCheckError);
        } else if (existingCompletedTx && existingCompletedTx.length > 0) {
          console.log('[WEBHOOK-PLURAL] Payment already processed, skipping to maintain idempotency');
          return NextResponse.json({ skipped: true, reason: "Payment already processed" });
        }
      } catch (error) {
        console.error('[WEBHOOK-PLURAL] Error in idempotency check:', error);
      }
      
      // Extract userId and listingId from session metadata
      const userId = session.metadata?.userId;
      const listingId = session.metadata?.listingId;
      const credits = session.metadata?.credits;
      const creditType = session.metadata?.creditType;

      // Skip credit purchase events - these are handled by the /api/webhook endpoint
      if (credits && creditType === 'featured' && !listingId) {
        console.log('[WEBHOOK-PLURAL] Skipping credit purchase event - handled by singular webhook');
        return NextResponse.json({ skipped: true, reason: "Credit purchase handled by other webhook" });
      }

      if (!userId || !listingId) {
        console.error('[WEBHOOK-PLURAL] Missing userId or listingId in metadata');
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }
      
      console.log('[WEBHOOK-PLURAL] Processing for userId:', userId, 'listingId:', listingId);

      // Create a Supabase client
      console.log('[WEBHOOK-PLURAL] Creating Supabase client');
      const supabase = createRouteHandlerClient({ cookies });
      
      try {
        // First, check the listing details to get current expiry
        console.log('[WEBHOOK-PLURAL] Checking listing details');
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('expires_at, type')
          .eq('id', listingId)
          .single();
          
        if (listingError) {
          console.error('[WEBHOOK-PLURAL] Error fetching listing details:', listingError);
          return NextResponse.json(
            { error: 'Error fetching listing details' },
            { status: 500 }
          );
        }
        
        console.log('[WEBHOOK-PLURAL] Listing details:', listingData);

        // Update the transaction status to completed
        console.log('[WEBHOOK-PLURAL] Updating transaction status to completed');
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
          console.error('[WEBHOOK-PLURAL] Error updating transaction:', transactionError);
          // Continue anyway, not critical
        } else {
          console.log('[WEBHOOK-PLURAL] Transaction updated successfully:', txData);
        }

        // Check for existing featured listing
        console.log('[WEBHOOK-PLURAL] Checking for existing featured listing');
        const { data: existingFeature, error: featureError } = await supabase
          .from('featured_listings')
          .select('*')
          .eq('listing_id', listingId)
          .gt('end_date', new Date().toISOString())
          .order('end_date', { ascending: false })
          .limit(1);

        if (featureError) {
          console.error('[WEBHOOK-PLURAL] Error checking for existing feature:', featureError);
          return NextResponse.json(
            { error: 'Error checking existing feature' },
            { status: 500 }
          );
        }

        console.log('[WEBHOOK-PLURAL] Existing feature check result:', existingFeature);
        
        // Always set start date to now and end date to 15 days from now
        // This ensures a consistent 15-day feature period regardless of any existing period
        const startDate = new Date().toISOString();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 15);
        const endDateIso = endDate.toISOString();
        
        console.log('[WEBHOOK-PLURAL] New feature period:', startDate, 'to', endDateIso);

        // Check if listing is expiring soon (less than 15 days)
        const currentExpiryDate = new Date(listingData.expires_at);
        const now = new Date();
        const daysUntilExpiry = Math.floor((currentExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('[WEBHOOK-PLURAL] Days until listing expiry:', daysUntilExpiry);
        
        // Calculate new expiry date for listing if needed
        let newExpiryDate = null;
        if (daysUntilExpiry < 15) {
          console.log('[WEBHOOK-PLURAL] Listing is expiring soon, will extend to 30 days');
          newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        }

        if (existingFeature && existingFeature.length > 0) {
          // If there's an existing feature, update its dates
          const feature = existingFeature[0];
          console.log('[WEBHOOK-PLURAL] Found existing feature. Will update to fixed 15-day period');
          
          // Update the existing featured listing with new dates
          console.log('[WEBHOOK-PLURAL] Updating existing featured listing');
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
            console.error('[WEBHOOK-PLURAL] Error updating feature:', updateError);
            return NextResponse.json(
              { error: 'Error updating feature' },
              { status: 500 }
            );
          }
          
          console.log(`[WEBHOOK-PLURAL] Reset feature for listing ${listingId} to new 15-day period`, updateData);
        } else {
          // Create new feature
          console.log('[WEBHOOK-PLURAL] No existing feature found, creating new one');
          
          // Insert new featured listing
          console.log('[WEBHOOK-PLURAL] Inserting new featured listing');
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
            console.error('[WEBHOOK-PLURAL] Error creating feature:', insertError);
            return NextResponse.json(
              { error: 'Error creating feature' },
              { status: 500 }
            );
          }
          
          console.log(`[WEBHOOK-PLURAL] Created new feature for listing ${listingId}:`, insertData);
        }

        // Update the listing
        const listingUpdateData: any = {};

        // Add the new expires_at if needed
        if (newExpiryDate) {
          listingUpdateData.expires_at = newExpiryDate.toISOString();
        }

        console.log('[WEBHOOK-PLURAL] Updating listing with:', listingUpdateData);

        // Only update if there's something to update
        if (Object.keys(listingUpdateData).length > 0) {
          const { error: listingUpdateError } = await supabase
            .from('listings')
            .update(listingUpdateData)
            .eq('id', listingId);
            
          if (listingUpdateError) {
            console.error('[WEBHOOK-PLURAL] Error updating listing:', listingUpdateError);
            // Not critical, continue
          } else {
            const updateMessage = newExpiryDate 
              ? `Listing expires_at updated successfully. New expiry: ${newExpiryDate.toISOString()}` 
              : 'No listing updates needed';
            console.log(`[WEBHOOK-PLURAL] ${updateMessage}`);
          }
        }

        console.log('[WEBHOOK-PLURAL] Webhook processing completed successfully');
        return NextResponse.json({ 
          success: true,
          feature_start: startDate,
          feature_end: endDateIso,
          listing_expiry: newExpiryDate ? newExpiryDate.toISOString() : listingData.expires_at
        });
      } catch (error) {
        console.error('[WEBHOOK-PLURAL] Unexpected error processing webhook:', error);
        return NextResponse.json(
          { error: 'Unexpected error processing webhook' },
          { status: 500 }
        );
      }
    }

    console.log('[WEBHOOK-PLURAL] Event type not handled:', event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK-PLURAL] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
} 