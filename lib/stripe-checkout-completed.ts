import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  FEATURE_DAYS,
  getFeatureEndDate,
  getListingExtendDate,
  LISTING_EXTEND_DAYS,
} from '@/lib/featured-listings'

type HandleOptions = {
  logPrefix: string
  handleCredits: boolean
}

export async function checkPaymentAlreadyProcessed(
  sessionId: string,
  logPrefix: string
): Promise<NextResponse | null> {
  try {
    const { data: existingCompletedTx, error: txCheckError } =
      await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('stripe_payment_id', sessionId)
        .eq('status', 'completed')
        .limit(1)

    if (txCheckError) {
      console.error(
        `${logPrefix} Error checking completed transactions:`,
        txCheckError
      )
      return null
    }

    if (existingCompletedTx && existingCompletedTx.length > 0) {
      console.log(
        `${logPrefix} Payment already processed, skipping to maintain idempotency`
      )
      return NextResponse.json({
        skipped: true,
        reason: 'Payment already processed',
      })
    }
  } catch (error) {
    console.error(`${logPrefix} Error in idempotency check:`, error)
  }

  return null
}

async function addCreditsToTable(
  table: 'credits' | 'credits_events',
  userId: string,
  credits: string,
  logPrefix: string
): Promise<NextResponse | null> {
  const label = table === 'credits_events' ? 'event credits' : 'credits'

  const { data: creditData, error: creditError } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .single()

  if (creditError && creditError.code !== 'PGRST116') {
    console.error(`${logPrefix} Error getting ${label} record:`, creditError)
    return NextResponse.json(
      { error: `Error fetching ${label} record` },
      { status: 500 }
    )
  }

  if (creditData) {
    console.log(`${logPrefix} Existing ${label} found:`, creditData)
    const currentCredits = parseInt(String(creditData.amount)) || 0
    const newCredits = currentCredits + parseInt(credits)

    console.log(
      `${logPrefix} Updating ${label} from ${currentCredits} to ${newCredits}`
    )

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        amount: newCredits.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error(`${logPrefix} Error updating ${label}:`, updateError)
      return NextResponse.json(
        { error: `Error updating ${label}` },
        { status: 500 }
      )
    }

    console.log(`${logPrefix} Updated ${label}. New balance: ${newCredits}`)
    return null
  }

  console.log(`${logPrefix} No existing ${label} found, creating new record`)

  const { error: insertError } = await supabaseAdmin.from(table).insert({
    user_id: userId,
    amount: credits.toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error(`${logPrefix} Error creating ${label} record:`, insertError)
    return NextResponse.json(
      { error: `Error creating ${label} record` },
      { status: 500 }
    )
  }

  console.log(
    `${logPrefix} Created new ${label} record with ${credits} credits`
  )
  return null
}

async function processCreditPurchase(
  session: Stripe.Checkout.Session,
  userId: string,
  credits: string,
  creditType: string,
  logPrefix: string
): Promise<NextResponse> {
  console.log(`${logPrefix} Processing credit purchase:`, {
    userId,
    credits,
    creditType,
  })

  try {
    console.log(
      `${logPrefix} Looking for transaction with payment ID:`,
      session.id
    )
    const { data: existingTx, error: findError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('stripe_payment_id', session.id)
      .eq('user_id', userId)

    if (findError) {
      console.error(`${logPrefix} Error finding transaction:`, findError)
    } else {
      console.log(`${logPrefix} Found transactions:`, existingTx)

      if (
        existingTx &&
        existingTx.length > 0 &&
        existingTx[0].status === 'completed'
      ) {
        console.log(
          `${logPrefix} Transaction already completed, skipping to prevent duplication`
        )
        return NextResponse.json({
          skipped: true,
          reason: 'Transaction already processed',
        })
      }

      const { data: recentCredits, error: recentError } = await supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('stripe_payment_id', session.id)
        .eq('status', 'completed')
        .limit(1)

      if (!recentError && recentCredits && recentCredits.length > 0) {
        console.log(`${logPrefix} Already processed this payment ID, skipping`)
        return NextResponse.json({
          skipped: true,
          reason: 'Payment already processed',
        })
      }
    }

    console.log(`${logPrefix} Updating credit transaction status to completed`)
    const { data: txData, error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .update({
        status: 'completed',
      })
      .eq('stripe_payment_id', session.id)
      .eq('user_id', userId)
      .select()

    if (transactionError) {
      console.error(
        `${logPrefix} Error updating credit transaction:`,
        transactionError
      )
    } else {
      console.log(
        `${logPrefix} Credit transaction updated successfully:`,
        txData
      )
    }

    console.log(`${logPrefix} Adding credits to user account`)

    const table = creditType === 'event' ? 'credits_events' : 'credits'
    const addError = await addCreditsToTable(table, userId, credits, logPrefix)
    if (addError) return addError

    console.log(`${logPrefix} Webhook processing completed successfully`)
    return NextResponse.json({ success: true, credits_added: credits })
  } catch (error) {
    console.error(
      `${logPrefix} Unexpected error processing credit purchase:`,
      error
    )
    return NextResponse.json(
      { error: 'Unexpected error processing credit purchase' },
      { status: 500 }
    )
  }
}

async function processFeaturedListingPurchase(
  session: Stripe.Checkout.Session,
  userId: string,
  listingId: string,
  logPrefix: string
): Promise<NextResponse> {
  console.log(
    `${logPrefix} Processing for userId:`,
    userId,
    'listingId:',
    listingId
  )

  try {
    console.log(`${logPrefix} Checking listing details`)
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('expires_at, type')
      .eq('id', listingId)
      .single()

    if (listingError) {
      console.error(
        `${logPrefix} Error fetching listing details:`,
        listingError
      )
      return NextResponse.json(
        { error: 'Error fetching listing details' },
        { status: 500 }
      )
    }

    console.log(`${logPrefix} Listing details:`, listingData)

    console.log(`${logPrefix} Updating transaction status to completed`)
    const { data: txData, error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .update({
        status: 'completed',
      })
      .eq('stripe_payment_id', session.id)
      .eq('user_id', userId)
      .eq('credit_type', 'featured')
      .eq('status', 'pending')
      .select()

    if (transactionError) {
      console.error(
        `${logPrefix} Error updating transaction:`,
        transactionError
      )
    } else {
      console.log(`${logPrefix} Transaction updated successfully:`, txData)
    }

    console.log(`${logPrefix} Checking for existing featured listing`)
    const { data: existingFeature, error: featureError } = await supabaseAdmin
      .from('featured_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .order('end_date', { ascending: false })
      .limit(1)

    if (featureError) {
      console.error(
        `${logPrefix} Error checking for existing feature:`,
        featureError
      )
      return NextResponse.json(
        { error: 'Error checking existing feature' },
        { status: 500 }
      )
    }

    console.log(`${logPrefix} Existing feature check result:`, existingFeature)

    const startDate = new Date().toISOString()
    const endDate = getFeatureEndDate()
    const endDateIso = endDate.toISOString()

    console.log(`${logPrefix} New feature period:`, startDate, 'to', endDateIso)

    const currentExpiryDate = new Date(listingData.expires_at)
    const now = new Date()
    const daysUntilExpiry = Math.floor(
      (currentExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    console.log(`${logPrefix} Days until listing expiry:`, daysUntilExpiry)

    let newExpiryDate: Date | null = null
    if (daysUntilExpiry <= FEATURE_DAYS) {
      console.log(
        `${logPrefix} Listing is expiring soon, will extend to ${LISTING_EXTEND_DAYS} days`
      )
      newExpiryDate = getListingExtendDate()
    }

    if (existingFeature && existingFeature.length > 0) {
      const feature = existingFeature[0]
      console.log(
        `${logPrefix} Found existing feature. Will update to fixed ${FEATURE_DAYS}-day period`
      )

      console.log(`${logPrefix} Updating existing featured listing`)
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('featured_listings')
        .update({
          start_date: startDate,
          end_date: endDateIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feature.id)
        .select()

      if (updateError) {
        console.error(`${logPrefix} Error updating feature:`, updateError)
        return NextResponse.json(
          { error: 'Error updating feature' },
          { status: 500 }
        )
      }

      console.log(
        `${logPrefix} Reset feature for listing ${listingId} to new ${FEATURE_DAYS}-day period`,
        updateData
      )
    } else {
      console.log(`${logPrefix} No existing feature found, creating new one`)

      console.log(`${logPrefix} Inserting new featured listing`)
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('featured_listings')
        .insert({
          listing_id: listingId,
          user_id: userId,
          start_date: startDate,
          end_date: endDateIso,
        })
        .select()

      if (insertError) {
        console.error(`${logPrefix} Error creating feature:`, insertError)
        return NextResponse.json(
          { error: 'Error creating feature' },
          { status: 500 }
        )
      }

      console.log(
        `${logPrefix} Created new feature for listing ${listingId}:`,
        insertData
      )
    }

    if (newExpiryDate) {
      const listingUpdateData = {
        expires_at: newExpiryDate.toISOString(),
      }
      console.log(`${logPrefix} Updating listing with:`, listingUpdateData)
      const { error: listingUpdateError } = await supabaseAdmin
        .from('listings')
        .update(listingUpdateData)
        .eq('id', listingId)

      if (listingUpdateError) {
        console.error(
          `${logPrefix} Error updating listing:`,
          listingUpdateError
        )
      } else {
        console.log(
          `${logPrefix} Listing expires_at updated successfully. New expiry: ${newExpiryDate.toISOString()}`
        )
      }
    } else {
      console.log(`${logPrefix} No listing updates needed`)
    }

    console.log(`${logPrefix} Webhook processing completed successfully`)
    return NextResponse.json({
      success: true,
      feature_start: startDate,
      feature_end: endDateIso,
      listing_expiry: newExpiryDate
        ? newExpiryDate.toISOString()
        : listingData.expires_at,
    })
  } catch (error) {
    console.error(`${logPrefix} Unexpected error processing webhook:`, error)
    return NextResponse.json(
      { error: 'Unexpected error processing webhook' },
      { status: 500 }
    )
  }
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  options: HandleOptions
): Promise<NextResponse> {
  const { logPrefix, handleCredits } = options

  console.log(`${logPrefix} Processing checkout.session.completed event`)
  console.log(`${logPrefix} Session ID:`, session.id)
  console.log(`${logPrefix} Session metadata:`, session.metadata)
  console.log(`${logPrefix} Session payment status:`, session.payment_status)

  const alreadyProcessed = await checkPaymentAlreadyProcessed(
    session.id,
    logPrefix
  )
  if (alreadyProcessed) return alreadyProcessed

  const userId = session.metadata?.userId
  const listingId = session.metadata?.listingId
  const credits = session.metadata?.credits
  const creditType = session.metadata?.creditType

  if (credits && creditType === 'featured' && !listingId && !handleCredits) {
    console.log(
      `${logPrefix} Skipping credit purchase event - handled by singular webhook`
    )
    return NextResponse.json({
      skipped: true,
      reason: 'Credit purchase handled by other webhook',
    })
  }

  if (handleCredits && credits && userId && creditType) {
    return processCreditPurchase(
      session,
      userId,
      credits,
      creditType,
      logPrefix
    )
  }

  if (userId && listingId) {
    return processFeaturedListingPurchase(session, userId, listingId, logPrefix)
  }

  if (!handleCredits) {
    console.error(`${logPrefix} Missing userId or listingId in metadata`)
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  console.log(`${logPrefix} No matching checkout handler for session metadata`)
  return NextResponse.json({ received: true })
}
