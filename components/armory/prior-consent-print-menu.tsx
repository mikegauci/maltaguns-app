'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/armory/status-badge'

export function PriorConsentPrintMenu({
  shipmentId,
  missingCount,
}: {
  shipmentId: string
  missingCount: number
}) {
  const base = `/profile/armory/print/prior-consent/${shipmentId}`

  return (
    <div className="inline-flex">
      <Button asChild size="sm" className="rounded-r-none">
        <a href={`${base}?mode=full`} target="_blank">
          Print Prior Consent
          {missingCount > 0 && (
            <StatusBadge tone="amber" className="ml-1">
              {missingCount} missing
            </StatusBadge>
          )}
        </a>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="default" className="rounded-l-none px-2">
            ▾
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem asChild>
            <Link href={`${base}?mode=full`} target="_blank">
              <div>
                <div className="font-medium">Full — my details + sender</div>
                <div className="text-xs text-muted-foreground">
                  Both sides filled in, closest to ready-to-submit.
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}?mode=self`} target="_blank">
              <div>
                <div className="font-medium">My details only</div>
                <div className="text-xs text-muted-foreground">
                  Recipient section filled; sender left for you to complete by
                  hand.
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}?mode=annex`} target="_blank">
              <div>
                <div className="font-medium">Annex only</div>
                <div className="text-xs text-muted-foreground">
                  Just the itemised firearms list.
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}?blank=1`} target="_blank">
              <div>
                <div className="font-medium">Blank form</div>
                <div className="text-xs text-muted-foreground">
                  Nothing filled in — for filling out entirely by hand.
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
