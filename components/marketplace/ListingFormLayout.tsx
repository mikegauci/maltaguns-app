import { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'

interface ListingFormLayoutProps {
  title: string
  description: string
  children: ReactNode
  credits?: number
  showCredits?: boolean
}

export function ListingFormLayout({
  title,
  description,
  children,
  credits,
  showCredits = false,
}: ListingFormLayoutProps) {
  return (
    <PageLayout containerSize="sm" padding="md">
        <div
          className={`mb-6 ${showCredits ? 'flex items-center justify-between' : ''}`}
        >
          <BackButton
            label="Back to listing types"
            href="/marketplace/create"
          />
          {showCredits && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Credits remaining:
              </span>
              <span className="font-semibold">{credits}</span>
            </div>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
    </PageLayout>
  )
}
