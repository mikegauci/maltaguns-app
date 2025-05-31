import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("Starting API endpoint execution");
    
    // Regular client for authentication
    const supabase = createRouteHandlerClient({ cookies });
    
    // Service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Verify admin session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.log("Session found for user ID:", session.user.id);

    // Check if user is admin
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();
    
    console.log("Profile data from profiles table:", profileData);
    
    // Verify admin status
    if (!profileData?.is_admin) {
      console.log("User is not admin");
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Get request data
    const { 
      id, 
      currentType, 
      newType, 
      name, 
      location, 
      logo_url, 
      ...otherFields 
    } = await req.json();
    
    console.log("Request data:", { id, currentType, newType, name, location });

    // Verify required fields
    if (!id || !currentType || !newType || !name || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // No changes needed if type hasn't changed
    if (currentType === newType) {
      // Just update the fields in the current table
      const sourceTable = `${currentType}s`;
      
      // Determine which field to update for the name based on type
      const nameField = (currentType === 'store' || currentType === 'servicing') 
        ? 'business_name' 
        : 'name';
      
      const updateData: any = {
        location,
        logo_url: logo_url || null,
        ...otherFields
      };
      
      // Set the appropriate name field
      updateData[nameField] = name;
      
      console.log(`Updating ${sourceTable} with:`, updateData);
      
      // Update establishment in database using admin client
      const { error } = await supabaseAdmin
        .from(sourceTable)
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error("Update error:", error);
        return NextResponse.json(
          { error: `Failed to update: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Establishment updated successfully"
      });
    }

    // Handle type change by moving the record to a different table
    // 1. Determine source and target tables
    const sourceTable = currentType === 'servicing' ? 'servicing' : `${currentType}s`;
    const targetTable = newType === 'servicing' ? 'servicing' : `${newType}s`;
    
    console.log(`Moving record from ${sourceTable} to ${targetTable}`);
    
    // 2. Determine field mappings for both tables
    const sourceNameField = (currentType === 'store' || currentType === 'servicing' || currentType === 'range') 
      ? 'business_name' 
      : 'name';
    
    const targetNameField = (newType === 'store' || newType === 'servicing' || newType === 'club' || newType === 'range') 
      ? 'business_name' 
      : 'name';
    
    console.log(`Source name field: ${sourceNameField}, Target name field: ${targetNameField}`);
    
    // 3. First, get the complete current record
    console.log(`Fetching current record from ${sourceTable} with ID: ${id}`);
    const { data: currentRecord, error: fetchError } = await supabaseAdmin
      .from(sourceTable)
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch record: ${fetchError.message}` },
        { status: 500 }
      );
    }
    
    if (!currentRecord) {
      console.log(`No record found in ${sourceTable} with ID: ${id}`);
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }
    
    console.log("Current record:", currentRecord);
    
    // 4. Prepare data for the new record
    // Create a new object with common fields that exist in all tables
    const commonFields = {
      owner_id: currentRecord.owner_id,
      location: location || currentRecord.location,
      phone: currentRecord.phone,
      email: currentRecord.email,
      description: currentRecord.description,
      website: currentRecord.website,
      slug: currentRecord.slug,
      logo_url: logo_url !== undefined ? logo_url : currentRecord.logo_url,
      created_at: new Date().toISOString(),
    };
    
    // Only add status if it's not for clubs table (which doesn't have this column)
    if (newType !== 'club' && currentRecord.status) {
      commonFields['status' as keyof typeof commonFields] = currentRecord.status;
    }
    
    // Add the name field using the appropriate key for the target table
    const newRecord: any = {
      ...commonFields
    };
    
    newRecord[targetNameField] = name;
    
    console.log(`New record to insert into ${targetTable}:`, newRecord);
    
    // 5. Insert record in the target table using admin client
    console.log(`Inserting new record into ${targetTable}`);
    
    const { data: insertedRecord, error: insertError } = await supabaseAdmin
      .from(targetTable)
      .insert([newRecord])
      .select();
      
    if (insertError) {
      console.error("Error inserting new record:", insertError);
      return NextResponse.json(
        { error: `Failed to insert record: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    console.log("Successfully inserted new record:", insertedRecord);
    
    // 6. Delete the old record using admin client
    console.log(`Deleting old record from ${sourceTable} with ID: ${id}`);
    const { error: deleteError } = await supabaseAdmin
      .from(sourceTable)
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      console.error("Error deleting old record:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete old record: ${deleteError.message}` },
        { status: 500 }
      );
    }
    
    console.log("Successfully deleted old record");

    return NextResponse.json({
      success: true,
      message: `Establishment updated and moved to ${newType}`
    });

  } catch (error: any) {
    console.error("Establishment update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update establishment" },
      { status: 500 }
    );
  }
} 