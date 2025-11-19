import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Create a Supabase client with the cookies for auth
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      console.error('No user found in session')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // If this is a firearms listing, check if user is verified
    if (data.type === 'firearms') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_verified, id_card_verified, license_image, id_card_image')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to verify user profile' },
          { status: 500 }
        )
      }

      if (!profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      // Check if user has verified license
      if (!profile.is_verified || !profile.license_image) {
        return NextResponse.json(
          {
            error:
              'You must have a verified firearms license to create a firearms listing. Please upload your license in your profile.',
          },
          { status: 403 }
        )
      }

      // Check if user has verified ID card
      if (!profile.id_card_verified || !profile.id_card_image) {
        return NextResponse.json(
          {
            error:
              'You must have a verified ID card to create a firearms listing. Please upload your ID card in your profile.',
          },
          { status: 403 }
        )
      }
    }

    // Format the images as a PostgreSQL array literal
    const imageUrls = data.images || []
    const formattedImages =
      imageUrls.length > 0
        ? `{${imageUrls.map((url: string) => `"${url}"`).join(',')}}`
        : `{}`

    // Create the listing with all required fields
    const listingData = {
      seller_id: user.id,
      type: data.type,
      category: data.category,
      subcategory: data.subcategory,
      calibre: data.calibre,
      title: data.title,
      description: data.description,
      price: data.price,
      images: formattedImages,
      thumbnail: imageUrls[0] || '',
      status: 'active',
      is_featured: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    }

    console.log('Creating listing with data:', listingData)

    // Create the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select('id, title')
      .single()

    if (listingError) {
      console.error('Error creating listing:', listingError)
      return NextResponse.json(
        { error: 'Failed to create listing', details: listingError },
        { status: 500 }
      )
    }

    // If this is a firearms listing, deduct credits
    if (data.type === 'firearms') {
      // Deduct one credit
      const { error: creditError } = await supabase
        .from('credits')
        .update({
          amount: data.currentCredits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        // Continue anyway since the listing was created
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -1,
          type: 'listing_creation',
        })

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
        // Continue anyway since the listing was created
      }
    }

    return NextResponse.json({ success: true, listing })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
