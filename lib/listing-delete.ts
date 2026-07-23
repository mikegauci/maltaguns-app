import { supabaseAdmin } from '@/lib/supabaseAdmin'

type DeleteListingCascadeOptions = {
  sellerId?: string
  logPrefix?: string
}

export async function deleteListingCascade(
  listingId: string,
  options: DeleteListingCascadeOptions = {}
): Promise<{ error: unknown } | { success: true }> {
  const logPrefix = options.logPrefix ?? '[DELETE LISTING]'

  const { error: featuredError } = await supabaseAdmin
    .from('featured_listings')
    .delete()
    .eq('listing_id', listingId)

  if (featuredError) {
    console.error(
      `${logPrefix} Error removing from featured listings:`,
      featuredError
    )
  }

  const { error: savedError } = await supabaseAdmin
    .from('saved_listings')
    .delete()
    .eq('listing_id', listingId)

  if (savedError) {
    console.error(
      `${logPrefix} Error removing from saved listings:`,
      savedError
    )
  }

  const { error: reportsError } = await supabaseAdmin
    .from('report_listings')
    .delete()
    .eq('listing_id', listingId)

  if (reportsError) {
    console.error(`${logPrefix} Error deleting listing reports:`, reportsError)
  }

  const { error: messagesError } = await supabaseAdmin
    .from('messages')
    .delete()
    .eq('listing_id', listingId)

  if (messagesError) {
    console.error(`${logPrefix} Error deleting messages:`, messagesError)
  }

  let deleteQuery = supabaseAdmin.from('listings').delete().eq('id', listingId)

  if (options.sellerId) {
    deleteQuery = deleteQuery.eq('seller_id', options.sellerId)
  }

  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    console.error(`${logPrefix} Error deleting listing:`, deleteError)
    return { error: deleteError }
  }

  return { success: true }
}
