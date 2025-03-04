import { supabase } from "@/lib/supabase";

/**
 * Handles the purchase of feature credits for a user
 * @param userId The ID of the user purchasing credits
 * @param amount The number of credits to add
 * @param sessionId The Stripe session ID for transaction tracking
 * @returns An object with success status and any error message
 */
export async function handleFeatureCreditPurchase(
  userId: string,
  amount: number,
  sessionId: string
) {
  try {
    console.log("[FEATURE CREDIT] Starting process for user:", userId, "amount:", amount, "sessionId:", sessionId);
    
    // First, verify that the user exists in the profiles table
    console.log("[FEATURE CREDIT] Verifying user exists in profiles table");
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();
    
    if (profileError) {
      console.error("[FEATURE CREDIT] Error verifying user:", profileError);
      
      // If the user doesn't exist, try to find them by email using the session data
      if (profileError.code === 'PGRST116') { // Not found
        console.log("[FEATURE CREDIT] User not found by ID, attempting to fetch session data");
        
        try {
          // Import Stripe dynamically to avoid issues with server components
          const Stripe = require('stripe');
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
          
          // Get the session data to find the customer email
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          const customerEmail = session.customer_email;
          
          if (customerEmail) {
            console.log("[FEATURE CREDIT] Found customer email from session:", customerEmail);
            
            // Look up the user by email
            const { data: userByEmail, error: emailLookupError } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customerEmail)
              .single();
            
            if (emailLookupError) {
              console.error("[FEATURE CREDIT] Error looking up user by email:", emailLookupError);
              return { success: false, error: "User not found by email" };
            }
            
            // Use the found user ID instead
            userId = userByEmail.id;
            console.log("[FEATURE CREDIT] Found user by email, using ID:", userId);
          } else {
            console.error("[FEATURE CREDIT] No customer email in session");
            return { success: false, error: "User not found and no email in session" };
          }
        } catch (stripeError) {
          console.error("[FEATURE CREDIT] Error retrieving session from Stripe:", stripeError);
          return { success: false, error: "Failed to retrieve session data" };
        }
      } else {
        return { success: false, error: "Failed to verify user" };
      }
    }
    
    // Now check if the user already has feature credits
    console.log("[FEATURE CREDIT] Checking for existing credits");
    const { data: existingCredits, error: fetchError } = await supabase
      .from("credits_featured")
      .select("amount")
      .eq("user_id", userId)
      .single();
      
    if (fetchError) {
      console.log("[FEATURE CREDIT] Fetch error code:", fetchError.code);
      if (fetchError.code !== 'PGRST116') { // Not found is ok
        console.error("[FEATURE CREDIT] Error fetching feature credits:", fetchError);
        return { success: false, error: "Failed to fetch feature credits" };
      }
      console.log("[FEATURE CREDIT] No existing credits found (expected)");
    } else {
      console.log("[FEATURE CREDIT] Existing credits found:", existingCredits);
    }
    
    const currentAmount = existingCredits?.amount || 0;
    const newAmount = currentAmount + amount;
    console.log("[FEATURE CREDIT] Current feature credits:", currentAmount, "New amount:", newAmount);
    
    // Now update or insert the record with the incremented amount
    console.log("[FEATURE CREDIT] Upserting credits record");
    const { error: upsertError } = await supabase
      .from("credits_featured")
      .upsert({ 
        user_id: userId,
        amount: newAmount,
        updated_at: new Date().toISOString(),
        created_at: existingCredits ? undefined : new Date().toISOString() // Only set created_at for new records
      });

    if (upsertError) {
      console.error("[FEATURE CREDIT] Error updating feature credits:", upsertError);
      return { success: false, error: "Error updating feature credits" };
    }
    
    console.log("[FEATURE CREDIT] Successfully updated feature credits to:", newAmount);
    
    // Check if a transaction record already exists for this session
    console.log("[FEATURE CREDIT] Checking for existing transaction with sessionId:", sessionId);
    const { data: existingTransaction, error: transactionFetchError } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("stripe_payment_id", sessionId)
      .single();
    
    if (transactionFetchError) {
      console.log("[FEATURE CREDIT] Transaction fetch error code:", transactionFetchError.code);
      if (transactionFetchError.code !== 'PGRST116') {
        console.error("[FEATURE CREDIT] Error checking for existing transaction:", transactionFetchError);
      } else {
        console.log("[FEATURE CREDIT] No existing transaction found (expected)");
      }
    } else {
      console.log("[FEATURE CREDIT] Existing transaction found:", existingTransaction);
    }
    
    if (existingTransaction) {
      // Update existing transaction status
      console.log("[FEATURE CREDIT] Updating existing transaction");
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .update({ status: "completed" })
        .eq("stripe_payment_id", sessionId);
      
      if (transactionError) {
        console.error("[FEATURE CREDIT] Error updating transaction:", transactionError);
        // Continue anyway as this is not critical
      } else {
        console.log("[FEATURE CREDIT] Transaction updated successfully");
      }
    } else {
      // Create a new transaction record
      console.log("[FEATURE CREDIT] Creating new transaction record");
      const { data: insertData, error: insertError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: amount,
          status: "completed",
          credit_type: "featured",
          description: `Purchase of ${amount} feature credit${amount > 1 ? 's' : ''}`,
          stripe_payment_id: sessionId
        })
        .select();
      
      if (insertError) {
        console.error("[FEATURE CREDIT] Error creating transaction record:", insertError);
        // Continue anyway as this is not critical
      } else {
        console.log("[FEATURE CREDIT] Transaction created successfully:", insertData);
      }
    }
    
    console.log("[FEATURE CREDIT] Process completed successfully");
    return { success: true };
  } catch (error) {
    console.error("[FEATURE CREDIT] Unexpected error processing feature credit purchase:", error);
    return { success: false, error: "Unexpected error processing feature credit purchase" };
  }
} 