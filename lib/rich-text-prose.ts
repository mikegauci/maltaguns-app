export const RICH_TEXT_TABLE_PROSE =
  '[&_table]:my-4 [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-sm [&_table]:border-collapse [&_thead_tr]:border-b [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_tr]:border-b [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_tbody]:text-muted-foreground [&_code]:text-xs'

export const LEGAL_PAGE_PROSE_CLASS = `prose prose-sm max-w-none text-foreground ${RICH_TEXT_TABLE_PROSE}`

export const EDITOR_PROSE_CLASS = `prose prose-neutral dark:prose-invert prose-strong:text-foreground prose-b:text-foreground focus:outline-none min-h-[200px] text-foreground ${RICH_TEXT_TABLE_PROSE}`
