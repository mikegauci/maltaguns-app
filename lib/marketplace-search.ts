export function sanitizePostgrestSearchTerm(term: string): string {
  return term
    .replace(/[%_,.()"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64)
}

export function buildListingSearchOrFilter(query: string): string | null {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map(sanitizePostgrestSearchTerm)
    .filter(Boolean)
    .slice(0, 8)

  if (terms.length === 0) return null

  return terms
    .map(term => `title.ilike.%${term}%,description.ilike.%${term}%`)
    .join(',')
}
