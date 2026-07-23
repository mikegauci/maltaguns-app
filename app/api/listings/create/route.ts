import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

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

      if (!profile.is_verified || !profile.license_image) {
        return NextResponse.json(
          {
            error:
              'You must have a verified firearms license to create a firearms listing. Please upload your license in your profile.',
          },
          { status: 403 }
        )
      }

      if (!profile.id_card_verified || !profile.id_card_image) {
        return NextResponse.json(
          {
            error:
              'You must have a verified identification to create a firearms listing. Please upload your identification in your profile.',
          },
          { status: 403 }
        )
      }
    }

    const imageUrls = data.images || []
    const formattedImages =
      imageUrls.length > 0
        ? `{${imageUrls.map((url: string) => `"${url}"`).join(',')}}`
        : `{}`

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
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      editable_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }

    console.log('Creating listing with data:', listingData)

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select('id, title, editable_until')
      .single()

    if (listingError) {
      console.error('Error creating listing:', listingError)
      return NextResponse.json(
        { error: 'Failed to create listing', details: listingError },
        { status: 500 }
      )
    }

    if (data.type === 'firearms') {
      const { error: creditError } = await supabase
        .from('credits')
        .update({
          amount: data.currentCredits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
      }

      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -1,
          type: 'listing_creation',
        })

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
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
