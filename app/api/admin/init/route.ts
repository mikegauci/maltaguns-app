import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Update all authorized admin emails using case-insensitive comparison
    const { error } = await supabase.rpc('update_admin_status', {
      admin_emails: AUTHORIZED_ADMIN_EMAILS
    })

    if (error) {
      console.error('Error updating admin status:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Verify the updates
    const { data: verifyProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('email, is_admin')
      .or(AUTHORIZED_ADMIN_EMAILS.map(email => 
        `email.ilike.${email}`
      ).join(','))

    if (verifyError) {
      console.error('Error verifying updates:', verifyError)
      return NextResponse.json(
        { error: 'Failed to verify updates' },
        { status: 500 }
      )
    }

    // Check if any authorized users are still not admins
    const nonAdminUsers = verifyProfiles
      ?.filter(p => !p.is_admin)
      .map(p => p.email)

    if (nonAdminUsers?.length > 0) {
      return NextResponse.json(
        { error: `Failed to set admin status for: ${nonAdminUsers.join(', ')}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      updatedProfiles: verifyProfiles
    })
  } catch (error) {
    console.error('Error initializing admin users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize admin users' },
      { status: 500 }
    )
  }
} 