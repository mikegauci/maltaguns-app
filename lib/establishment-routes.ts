export function establishmentRouteSegment(type: string): string {
  switch (type) {
    case 'store':
    case 'stores':
      return 'stores'
    case 'club':
    case 'clubs':
      return 'clubs'
    case 'range':
    case 'ranges':
      return 'ranges'
    case 'servicing':
      return 'servicing'
    default:
      return type
  }
}

export function establishmentPublicPath(
  type: string,
  slug: string,
  id?: string
): string {
  return `/establishments/${establishmentRouteSegment(type)}/${slug || id || ''}`
}
