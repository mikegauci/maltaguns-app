import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

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
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div
          className={`mb-6 ${showCredits ? 'flex items-center justify-between' : ''}`}
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/marketplace/create')}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listing types
          </Button>
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
      </div>
    </div>
  )
}
