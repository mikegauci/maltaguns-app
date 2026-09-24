export function getBlogPostPublicPath(
  category: string,
  slug: string,
  isHelpGuide = false,
  published = true
) {
  if (category === 'guides' && isHelpGuide && published) {
    return `/help/guides/${slug}`
  }
  return `/blog/${category}/${slug}`
}
