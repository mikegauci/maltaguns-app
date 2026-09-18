import Link from 'next/link'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
  AdminOverviewRecentPayment,
  AdminOverviewRecentSignup,
} from '@/lib/admin-overview-types'

interface AdminOverviewListsProps {
  recentSignups: AdminOverviewRecentSignup[]
  recentPayments: AdminOverviewRecentPayment[]
}

export function AdminOverviewLists({
  recentSignups,
  recentPayments,
}: AdminOverviewListsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Recent signups</CardTitle>
            <CardDescription>Latest user registrations</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent signups.</p>
          ) : (
            <ul className="divide-y">
              {recentSignups.map(signup => (
                <li
                  key={signup.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{signup.username}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {signup.email}
                    </p>
                  </div>
                  <time
                    dateTime={signup.createdAt}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {format(new Date(signup.createdAt), 'dd MMM yyyy')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription>Latest credit transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/payments-received">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent payments.</p>
          ) : (
            <ul className="divide-y">
              {recentPayments.map(payment => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.username}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {payment.type}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">€{payment.amount}</p>
                    <time
                      dateTime={payment.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
