'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export function ManualAddSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex h-full flex-col"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-muted/50 text-muted-foreground">
          <Plus className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Add single item
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Local purchase not on a spreadsheet? Enter make, model, and serial
            directly.
          </p>
        </div>
      </div>
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex w-full items-center justify-between rounded-sm border border-border bg-muted/20 px-3 py-2.5 text-left text-sm font-medium transition-colors',
          'hover:border-primary/30 hover:bg-muted/30',
          open && 'border-primary/40 bg-muted/30'
        )}
      >
        {open ? 'Hide form' : 'Open add-item form'}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-sm border border-dashed border-border bg-muted/10 p-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
