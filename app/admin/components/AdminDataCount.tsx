interface AdminDataCountProps {
  count: number
  singularLabel: string
  pluralLabel?: string
  emptyMessage?: string
}

/**
 * Display count of data records with proper pluralization
 */
export function AdminDataCount({
  count,
  singularLabel,
  pluralLabel,
  emptyMessage,
}: AdminDataCountProps) {
  const plural = pluralLabel || `${singularLabel}s`
  const empty = emptyMessage || `No ${plural.toLowerCase()} found.`

  return (
    <p className="text-muted-foreground mb-6">
      {count === 0
        ? empty
        : `Showing ${count} ${count === 1 ? singularLabel.toLowerCase() : plural.toLowerCase()}.`}
    </p>
  )
}
