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
      console.log('[WEBHOOK-SINGULAR] Session payment status:', session.payment_status);
      console.log('[WEBHOOK-SINGULAR] Event ID:', event.id);
      
      // Global idempotency check - check if we've already processed this payment
      try {
        const { data: existingCompletedTx, error: txCheckError } = await supabaseAdmin
          .from('credit_transactions')
          .select('*')
          .eq('stripe_payment_id', session.id)
          .eq('status', 'completed')
          .limit(1);
          
        if (txCheckError) {
          console.error('[WEBHOOK-SINGULAR] Error checking completed transactions:', txCheckError);
        } else if (existingCompletedTx && existingCompletedTx.length > 0) {
          console.log('[WEBHOOK-SINGULAR] Payment already processed, skipping to maintain idempotency');
          return NextResponse.json({ skipped: true, reason: "Payment already processed" });
        }
      } catch (error) {
        console.error('[WEBHOOK-SINGULAR] Error in idempotency check:', error);
      }
      
      // Extract metadata from session
      const userId = session.metadata?.userId;
      const listingId = session.metadata?.listingId;
      const credits = session.metadata?.credits;
      const creditType = session.metadata?.creditType;

      // Check if this is a credit purchase (has credits in metadata)
      if (credits && userId && creditType) {
        console.log('[WEBHOOK-SINGULAR] Processing credit purchase:', { userId, credits, creditType });
        
        try {
          // Find the transaction first using admin client
          console.log('[WEBHOOK-SINGULAR] Looking for transaction with payment ID:', session.id);
          const { data: existingTx, error: findError } = await supabaseAdmin
            .from('credit_transactions')
            .select('*')
            .eq('stripe_payment_id', session.id)
            .eq('user_id', userId);
            
          if (findError) {
            console.error('[WEBHOOK-SINGULAR] Error finding transaction:', findError);
          } else {
            console.log('[WEBHOOK-SINGULAR] Found transactions:', existingTx);
            
            // Check if transaction is already completed to prevent duplicate processing
            if (existingTx && existingTx.length > 0 && existingTx[0].status === 'completed') {
              console.log('[WEBHOOK-SINGULAR] Transaction already completed, skipping to prevent duplication');
              return NextResponse.json({ skipped: true, reason: "Transaction already processed" });
            }
            
            // Extra safeguard - check if we've already added these credits by looking at transaction description
            const { data: recentCredits, error: recentError } = await supabaseAdmin
              .from('credit_transactions')
              .select('*')
              .eq('user_id', userId)
              .eq('stripe_payment_id', session.id)
              .eq('status', 'completed')
              .limit(1);
              
            if (!recentError && recentCredits && recentCredits.length > 0) {
              console.log('[WEBHOOK-SINGULAR] Already processed this payment ID, skipping');
              return NextResponse.json({ skipped: true, reason: "Payment already processed" });
            }
          }
          
          // Update the transaction status to completed
          console.log('[WEBHOOK-SINGULAR] Updating credit transaction status to completed');
          const { data: txData, error: transactionError } = await supabaseAdmin
            .from('credit_transactions')
            .update({
              status: 'completed'
            })
            .eq('stripe_payment_id', session.id)
            .eq('user_id', userId)
            .select();

          if (transactionError) {
            console.error('[WEBHOOK-SINGULAR] Error updating credit transaction:', transactionError);
            // Continue anyway, not critical
          } else {
            console.log('[WEBHOOK-SINGULAR] Credit transaction updated successfully:', txData);
          }
          
          // Add credits to user's account - using the existing credits table
          console.log('[WEBHOOK-SINGULAR] Adding credits to user account');
          
          // Handle different credit types
          if (creditType === 'event') {
            // Event credits go to credits_events table
            console.log('[WEBHOOK-SINGULAR] Processing event credits');
            
            // Look for existing event credit record for this user
            const { data: eventCreditData, error: eventCreditError } = await supabaseAdmin
              .from('credits_events')
              .select('*')
              .eq('user_id', userId)
              .single();
              
            if (eventCreditError && eventCreditError.code !== 'PGRST116') { // PGRST116 = not found
              console.error('[WEBHOOK-SINGULAR] Error getting event credit record:', eventCreditError);
              return NextResponse.json(
                { error: 'Error fetching event credit record' },
                { status: 500 }
              );
            }
            
            if (eventCreditData) {
              // Update existing event credits
              console.log('[WEBHOOK-SINGULAR] Existing event credits found:', eventCreditData);
              const currentCredits = parseInt(eventCreditData.amount) || 0;
              const newCredits = currentCredits + parseInt(credits);
              
              console.log(`[WEBHOOK-SINGULAR] Updating event credits from ${currentCredits} to ${newCredits}`);
              
              const { error: updateError } = await supabaseAdmin
                .from('credits_events')
                .update({
                  amount: newCredits.toString(), // Convert to string since your data shows amount as string
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
                
              if (updateError) {
                console.error('[WEBHOOK-SINGULAR] Error updating event credits:', updateError);
                return NextResponse.json(
                  { error: 'Error updating event credits' },
                  { status: 500 }
                );
              }
              
              console.log(`[WEBHOOK-SINGULAR] Updated event credits. New balance: ${newCredits}`);
            } else {
              // Create new event credit record
              console.log('[WEBHOOK-SINGULAR] No existing event credits found, creating new record');
              
              const { error: insertError } = await supabaseAdmin
                .from('credits_events')
                .insert({
                  user_id: userId,
                  amount: credits.toString(), // Convert to string since your data shows amount as string
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
                console.error('[WEBHOOK-SINGULAR] Error creating event credit record:', insertError);
                return NextResponse.json(
                  { error: 'Error creating event credit record' },
                  { status: 500 }
                );
              }
              
              console.log(`[WEBHOOK-SINGULAR] Created new event credit record with ${credits} credits`);
            }
          } else {
            // Featured credits go to credits table
            // Look for existing credit record for this user
            const { data: creditData, error: creditError } = await supabaseAdmin
              .from('credits')
              .select('*')
              .eq('user_id', userId)
              .single();
              
            if (creditError && creditError.code !== 'PGRST116') { // PGRST116 = not found
              console.error('[WEBHOOK-SINGULAR] Error getting credit record:', creditError);
              return NextResponse.json(
                { error: 'Error fetching credit record' },
                { status: 500 }
              );
            }
            
            if (creditData) {
              // Update existing credits
              console.log('[WEBHOOK-SINGULAR] Existing credits found:', creditData);
              const currentCredits = parseInt(creditData.amount) || 0;
              const newCredits = currentCredits + parseInt(credits);
              
              console.log(`[WEBHOOK-SINGULAR] Updating credits from ${currentCredits} to ${newCredits}`);
              
              const { error: updateError } = await supabaseAdmin
                .from('credits')
                .update({
                  amount: newCredits.toString(), // Convert to string since your data shows amount as string
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
                
              if (updateError) {
                console.error('[WEBHOOK-SINGULAR] Error updating credits:', updateError);
                return NextResponse.json(
                  { error: 'Error updating credits' },
                  { status: 500 }
                );
              }
              
              console.log(`[WEBHOOK-SINGULAR] Updated credits. New balance: ${newCredits}`);
            } else {
              // Create new credit record
              console.log('[WEBHOOK-SINGULAR] No existing credits found, creating new record');
              
              const { error: insertError } = await supabaseAdmin
                .from('credits')
                .insert({
                  user_id: userId,
                  amount: credits.toString(), // Convert to string since your data shows amount as string
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
                console.error('[WEBHOOK-SINGULAR] Error creating credit record:', insertError);
                return NextResponse.json(
                  { error: 'Error creating credit record' },
                  { status: 500 }
                );
              }
              
              console.log(`[WEBHOOK-SINGULAR] Created new credit record with ${credits} credits`);
            }
          }
          
          console.log('[WEBHOOK-SINGULAR] Webhook processing completed successfully');
          return NextResponse.json({ success: true, credits_added: credits });
        } catch (error) {
          console.error('[WEBHOOK-SINGULAR] Unexpected error processing credit purchase:', error);
          return NextResponse.json(
            { error: 'Unexpected error processing credit purchase' },
            { status: 500 }
          );
        }
      }
      
      // If this is a featured listing purchase (has listingId)
      if (userId && listingId) {
        console.log('[WEBHOOK-SINGULAR] Processing for userId:', userId, 'listingId:', listingId);
        
        // Create a Supabase client
        const supabase = createRouteHandlerClient({ cookies });
        
        try {
          // First, check the listing details to get current expiry
          console.log('[WEBHOOK-SINGULAR] Checking listing details');
          const { data: listingData, error: listingError } = await supabaseAdmin
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
          const { data: txData, error: transactionError } = await supabaseAdmin
            .from('credit_transactions')
            .update({
              status: 'completed'
            })
            .eq('stripe_payment_id', session.id)
            .eq('user_id', userId)
            .eq('credit_type', 'featured')
            .select();

          if (transactionError) {
            console.error('[WEBHOOK-SINGULAR] Error updating transaction:', transactionError);
            // Continue anyway, not critical
          } else {
            console.log('[WEBHOOK-SINGULAR] Transaction updated successfully:', txData);
          }

          // Check for existing featured listing
          console.log('[WEBHOOK-SINGULAR] Checking for existing featured listing');
          const { data: existingFeature, error: featureError } = await supabaseAdmin
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

          // Handle the featured listing (update existing or create new)
          if (existingFeature && existingFeature.length > 0) {
            // If there's an existing feature, update its dates
            const feature = existingFeature[0];
            console.log('[WEBHOOK-SINGULAR] Found existing feature. Will update to fixed 15-day period');
            
            // Update the existing featured listing with new dates
            console.log('[WEBHOOK-SINGULAR] Updating existing featured listing');
            const { data: updateData, error: updateError } = await supabaseAdmin
              .from('featured_listings')
              .update({
                start_date: startDate,
                end_date: endDateIso,
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
            const { data: insertData, error: insertError } = await supabaseAdmin
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

          // Update the listing's expiry date if needed
          const listingUpdateData: any = {};

          // Add the new expires_at if needed
          if (newExpiryDate) {
            listingUpdateData.expires_at = newExpiryDate.toISOString();
          }

          // Only update if there's something to update
          if (Object.keys(listingUpdateData).length > 0) {
            console.log('[WEBHOOK-SINGULAR] Updating listing with:', listingUpdateData);
            const { error: listingUpdateError } = await supabaseAdmin
              .from('listings')
              .update(listingUpdateData)
              .eq('id', listingId);
            
            if (listingUpdateError) {
              console.error('[WEBHOOK-SINGULAR] Error updating listing:', listingUpdateError);
              // Not critical, continue
            } else {
              const updateMessage = newExpiryDate 
                ? `Listing expires_at updated successfully. New expiry: ${newExpiryDate.toISOString()}` 
                : 'No listing updates needed';
              console.log(`[WEBHOOK-SINGULAR] ${updateMessage}`);
            }
          } else {
            console.log('[WEBHOOK-SINGULAR] No listing updates needed');
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