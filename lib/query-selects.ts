export const LISTING_CARD_SELECT =
  'id, title, slug, price, thumbnail, description, category, subcategory, calibre, type, status, created_at, updated_at, expires_at, seller_id'

export const LISTING_DETAIL_SELECT = `
  *,
  seller:profiles(username, email, phone, contact_preference)
`

export const BLOG_CARD_SELECT = `
  id,
  title,
  slug,
  category,
  featured_image,
  meta_description,
  created_at,
  author_id,
  store_id,
  club_id,
  range_id,
  servicing_id,
  author:profiles(username),
  store:stores(id, business_name, slug),
  club:clubs(id, business_name, slug),
  range:ranges(id, business_name, slug),
  servicing:servicing(id, business_name, slug)
`

export const BLOG_HOME_SELECT = `
  id,
  title,
  slug,
  category,
  featured_image,
  meta_description,
  created_at,
  author:profiles(username)
`

export const EVENT_CARD_SELECT =
  'id, title, description, organizer, type, start_date, end_date, start_time, end_time, location, poster_url, price, slug'

export const EVENT_HOME_SELECT = 'id, title, type, start_date, poster_url, slug'

export const ESTABLISHMENT_CARD_SELECT =
  'id, business_name, logo_url, location, phone, email, description, website, slug, status, created_at, owner_id, meta_title, meta_description'

export const SITE_SETTINGS_SELECT =
  'id, site_title, site_description, default_og_image, twitter_handle, page_seo, marketplace_meta_title, marketplace_meta_description, events_meta_title, events_meta_description, blog_meta_title, blog_meta_description, establishments_meta_title, establishments_meta_description, updated_at'

export const PUBLIC_API_CACHE_CONTROL =
  'public, s-maxage=120, stale-while-revalidate=300'
