import type { SupabaseClient } from '@supabase/supabase-js'
import { translateToEnglish } from '@/lib/armory/ai'

export const ARMORY_DEALER_BUCKET = 'armory-dealer'

export type EgunListing = {
  listingId: string
  url: string
  title: string | null
  price: number | null
  domesticShipping: number | null
  descriptionRaw: string | null
  descriptionEn: string | null
  imageUrls: string[]
  seller: string | null
  htmlLength: number
  parseNotes: string[]
}

export type EgunImageRef = {
  file: string
  url: string
}

const BASE = '/profile/armory'

export function egunImageServePath(itemId: string, file: string) {
  return `${BASE}/inventory/${itemId}/egun-image/${encodeURIComponent(file)}`
}

export function isSafeEgunImageName(file: string): boolean {
  return /^egun-\d{2}\.(jpe?g|png|webp)$/i.test(file)
}

function storagePath(
  dealerAccountId: string,
  itemId: string,
  fileName: string
) {
  return `${dealerAccountId}/${itemId}/${fileName}`
}

export function egunIdFromInput(input: string): string | null {
  const s = input.trim()
  const m =
    s.match(/(?:item\.php\?id=|\/item\/)(\d{5,})/) ?? s.match(/^(\d{5,})$/)
  return m ? m[1] : null
}

export function egunUrl(listingId: string) {
  return `https://www.egun.de/market/item.php?id=${listingId}`
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&euro;/g, '€')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseEuro(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{2}))?/)
  if (!m) return null
  return parseFloat(m[1].replace(/\./g, '') + '.' + (m[2] ?? '00'))
}

export function parseEgunHtml(html: string, listingId: string): EgunListing {
  const notes: string[] = []
  const url = egunUrl(listingId)

  let title: string | null = null
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) title = stripTags(h1[1])
  if (!title) {
    const t = html.match(/<title>([\s\S]*?)<\/title>/i)
    if (t)
      title = stripTags(t[1])
        .replace(/\s*[-|].*egun.*$/i, '')
        .trim()
  }
  if (!title) notes.push('title not found')

  let price: number | null = null
  const priceLabels = [
    /Sofort-?Kaufen[^0-9]{0,80}([\d.,]+)\s*(?:€|EUR)/i,
    /(?:Aktuelles Gebot|Höchstgebot|Gebot|Preis|Endpreis|Zuschlag)[^0-9]{0,80}([\d.,]+)\s*(?:€|EUR)/i,
    /([\d.,]+)\s*(?:€|EUR)/,
  ]
  for (const re of priceLabels) {
    const m = html.match(re)
    if (m) {
      price = parseEuro(m[1])
      if (price !== null) break
    }
  }
  if (price === null) notes.push('price not found')

  let domesticShipping: number | null = null
  const shipRes = [
    /Versandkosten[^<]{0,40}(?:Deutschland|Inland|DE)?[^0-9]{0,120}([\d.,]+)\s*(?:€|EUR)/i,
    /Versand(?:\s*nach)?\s*(?:Deutschland|Inland)[^0-9]{0,120}([\d.,]+)\s*(?:€|EUR)/i,
    /Versand[^0-9<]{0,60}([\d.,]+)\s*(?:€|EUR)/i,
  ]
  for (const re of shipRes) {
    const m = html.match(re)
    if (m) {
      domesticShipping = parseEuro(m[1])
      if (domesticShipping !== null) break
    }
  }
  if (domesticShipping === null) notes.push('domestic shipping fee not found')

  let descriptionRaw: string | null = null
  const descMatch =
    html.match(
      /Beschreibung[\s\S]{0,300}?<(?:div|td|p)[^>]*>([\s\S]*?)<\/(?:div|td)>\s*(?:<\/tr>|<div|<h\d|$)/i
    ) ??
    html.match(
      /id=["'](?:description|item_description|beschreibung)["'][^>]*>([\s\S]*?)<\/(?:div|td)>/i
    )
  if (descMatch) descriptionRaw = stripTags(descMatch[1])
  if (!descriptionRaw || descriptionRaw.length < 20) {
    const blocks = Array.from(
      html.matchAll(/<(?:div|td)[^>]*>([\s\S]{200,20000}?)<\/(?:div|td)>/gi)
    ).map(m => stripTags(m[1]))
    blocks.sort((a, b) => b.length - a.length)
    descriptionRaw = blocks[0] ?? null
    if (descriptionRaw)
      notes.push('description taken from largest text block — verify')
  }
  if (!descriptionRaw) notes.push('description not found')

  const imgSet = new Set<string>()
  for (const m of Array.from(
    html.matchAll(
      /(?:src|href|data-src|data-large|data-zoom-image)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi
    )
  )) {
    let u = m[1]
    if (u.startsWith('//')) u = 'https:' + u
    else if (u.startsWith('/')) u = 'https://www.egun.de' + u
    if (!/egun/i.test(u)) continue
    if (
      /(logo|icon|button|flag|banner|smiley|spacer|blank|pixel|thumb_?small)/i.test(
        u
      )
    )
      continue
    imgSet.add(u)
  }
  const imageUrls = Array.from(imgSet).filter(
    u => !/(_s\.|_t\.|thumb)/i.test(u) || imgSet.size < 3
  )
  if (imageUrls.length === 0) notes.push('no images found')

  let seller: string | null = null
  const sm = html.match(
    /(?:Verkäufer|Anbieter)[^<]{0,40}<[^>]*>\s*(?:<[^>]*>)*\s*([^<]{2,60})</i
  )
  if (sm) seller = decodeEntities(sm[1]).trim()

  return {
    listingId,
    url,
    title,
    price,
    domesticShipping,
    descriptionRaw,
    descriptionEn: null,
    imageUrls,
    seller,
    htmlLength: html.length,
    parseNotes: notes,
  }
}

export async function fetchEgunListing(
  listingId: string
): Promise<EgunListing> {
  const url = egunUrl(listingId)
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MaltaGunsArmory/1.0 (+permission granted by eGun)',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5',
    },
  })
  if (!res.ok) throw new Error(`eGun responded ${res.status} for ${url}`)
  const html = await res.text()
  const listing = parseEgunHtml(html, listingId)
  if (listing.descriptionRaw) {
    listing.descriptionEn = await translateToEnglish(listing.descriptionRaw)
  }
  return listing
}

export async function downloadImages(
  supabase: SupabaseClient,
  dealerAccountId: string,
  itemId: string,
  urls: string[],
  limit = 12
): Promise<{ saved: string[]; failed: string[] }> {
  const prefix = `${dealerAccountId}/${itemId}/`
  const { data: existing } = await supabase.storage
    .from(ARMORY_DEALER_BUCKET)
    .list(`${dealerAccountId}/${itemId}`, { limit: 100 })
  if (existing?.length) {
    const paths = existing
      .filter(f => f.name && isSafeEgunImageName(f.name))
      .map(f => `${prefix}${f.name}`)
    if (paths.length) {
      await supabase.storage.from(ARMORY_DEALER_BUCKET).remove(paths)
    }
  }

  const saved: string[] = []
  const failed: string[] = []
  let n = 0
  for (const u of urls.slice(0, limit)) {
    try {
      const res = await fetch(u, {
        headers: { Referer: 'https://www.egun.de/' },
      })
      if (!res.ok) throw new Error(String(res.status))
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 4000) continue
      const ext = (u.match(/\.(jpe?g|png|webp)/i)?.[1] ?? 'jpg')
        .toLowerCase()
        .replace('jpeg', 'jpg')
      const name = `egun-${String(++n).padStart(2, '0')}.${ext}`
      const path = storagePath(dealerAccountId, itemId, name)
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg'
      const { error } = await supabase.storage
        .from(ARMORY_DEALER_BUCKET)
        .upload(path, buf, { upsert: true, contentType })
      if (error) throw error
      saved.push(name)
    } catch {
      failed.push(u)
    }
  }
  return { saved, failed }
}

export async function listDownloadedImages(
  supabase: SupabaseClient,
  dealerAccountId: string,
  itemId: string
): Promise<EgunImageRef[]> {
  const { data, error } = await supabase.storage
    .from(ARMORY_DEALER_BUCKET)
    .list(`${dealerAccountId}/${itemId}`, { limit: 100 })
  if (error || !data?.length) return []
  return data
    .filter(f => f.name && isSafeEgunImageName(f.name))
    .sort((a, b) => a.name!.localeCompare(b.name!))
    .map(f => ({
      file: f.name!,
      url: egunImageServePath(itemId, f.name!),
    }))
}

export async function fetchEgunImageBlob(
  supabase: SupabaseClient,
  dealerAccountId: string,
  itemId: string,
  file: string
): Promise<{ blob: Blob; contentType: string } | null> {
  if (!isSafeEgunImageName(file)) return null
  const path = storagePath(dealerAccountId, itemId, file)
  const { data, error } = await supabase.storage
    .from(ARMORY_DEALER_BUCKET)
    .download(path)
  if (error || !data) return null
  const ext = file.split('.').pop()?.toLowerCase()
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return { blob: data, contentType }
}
