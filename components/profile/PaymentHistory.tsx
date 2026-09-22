'use client'

import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CreditTransaction } from '../../app/profile/types'

interface PaymentHistoryProps {
  creditTransactions: CreditTransaction[]
  listingIdToTitleMap: Record<string, string>
}

function getTransactionStatusLabel(status: string | null, type: string) {
  const normalizedStatus =
    status || (type === 'debit' ? 'completed' : 'pending')

  switch (normalizedStatus) {
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'failed':
      return 'Failed'
    case 'pending':
      return 'Pending'
    default:
      return normalizedStatus
  }
}

function getTransactionStatusVariant(
  status: string | null,
  type: string
): 'default' | 'outline' | 'secondary' | 'destructive' {
  const normalizedStatus =
    status || (type === 'debit' ? 'completed' : 'pending')

  switch (normalizedStatus) {
    case 'completed':
      return 'default'
    case 'pending':
      return 'outline'
    case 'cancelled':
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export const PaymentHistory = ({
  creditTransactions,
  listingIdToTitleMap,
}: PaymentHistoryProps) => {
  if (creditTransactions.length === 0) return null

  return (
    <AppCard>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Your transaction history on MaltaGuns
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border text-left">
                <th className="pb-3 pt-1 pl-4 pr-6 font-medium text-muted-foreground bg-background w-[160px]">
                  Date
                </th>
                <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[140px]">
                  Type
                </th>
                <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[100px]">
                  Amount
                </th>
                <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background">
                  Description
                </th>
                <th className="pb-3 pt-1 px-4 font-medium text-muted-foreground bg-background w-[140px] text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditTransactions.map((transaction: CreditTransaction) => {
                let description = transaction.description
                  ? transaction.description.replace(
                      /\s*\(price_\d+credits?\)\s*/g,
                      ''
                    )
                  : '—'

                const isFeaturePurchase = description.includes(
                  'Feature listing purchase for listing'
                )

                if (isFeaturePurchase) {
                  const match = description.match(
                    /Feature listing purchase for listing ([0-9a-f-]+)/
                  )
                  if (match && match[1] && listingIdToTitleMap[match[1]]) {
                    description = description.replace(
                      `Feature listing purchase for listing ${match[1]}`,
                      `Feature listing purchase for "${listingIdToTitleMap[match[1]]}"`
                    )
                  }
                }

                const statusLabel = getTransactionStatusLabel(
                  transaction.status,
                  transaction.type
                )
                const statusVariant = getTransactionStatusVariant(
                  transaction.status,
                  transaction.type
                )

                return (
                  <tr
                    key={transaction.id}
                    className="border-b border-border hover:bg-muted/20"
                  >
                    <td className="py-4 pl-4 pr-6 text-sm tabular-nums">
                      {format(new Date(transaction.created_at), 'PPP')}
                    </td>
                    <td className="py-4 px-4 text-sm align-top">
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant={
                            transaction.type === 'credit'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {transaction.type === 'credit' ? 'Purchase' : 'Usage'}
                        </Badge>
                        {transaction.credit_type && (
                          <Badge variant="outline">
                            {transaction.credit_type === 'featured'
                              ? isFeaturePurchase
                                ? 'Feature'
                                : 'Listing'
                              : 'Event'}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span
                        className={
                          transaction.type === 'credit'
                            ? 'font-medium text-emerald-400'
                            : 'font-medium text-red-400'
                        }
                      >
                        {transaction.type === 'credit' ? '+' : '-'}
                        {transaction.amount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">{description}</td>
                    <td className="py-4 px-4 text-sm text-right">
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </AppCard>
  )
}
