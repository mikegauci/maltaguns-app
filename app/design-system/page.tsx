import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent } from '@/components/ui/card'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import {
  AppAlert,
  AppCard,
  AppPageToolbar,
  AppSectionHeading,
} from '@/components/design-system'

const swatches = [
  { name: 'chrome-bg', className: 'bg-chrome-bg', hex: '#0f1114' },
  { name: 'chrome-surface', className: 'bg-chrome-surface', hex: '#1a1d21' },
  { name: 'chrome-slate', className: 'bg-chrome-slate', hex: '#2a2f36' },
  { name: 'chrome-brand', className: 'bg-chrome-brand', hex: '#cb0e0e' },
  { name: 'chrome-border', className: 'bg-chrome-border', hex: '#3f3f46' },
  { name: 'background', className: 'bg-background', hex: 'shadcn' },
  { name: 'card', className: 'bg-card', hex: 'shadcn' },
  { name: 'primary', className: 'bg-primary', hex: 'shadcn' },
  { name: 'muted', className: 'bg-muted', hex: 'shadcn' },
  { name: 'destructive', className: 'bg-destructive', hex: 'shadcn' },
]

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <PageLayout>
      <PageHeader
        title="Design System"
        description="MaltaGuns dark tactical reference — dev only. See docs/design-system.md and .cursor/skills/maltaguns-design-system/SKILL.md."
      />

      <div className="space-y-12">
        <section>
          <AppSectionHeading>Colors</AppSectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {swatches.map(swatch => (
              <div key={swatch.name} className="space-y-2">
                <div
                  className={`h-16 rounded-sm border border-border ${swatch.className}`}
                />
                <p className="text-xs font-medium">{swatch.name}</p>
                <p className="text-xs text-muted-foreground">{swatch.hex}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <AppSectionHeading>Typography</AppSectionHeading>
          <div className="space-y-4 rounded-sm border border-border p-6">
            <h1 className="app-display text-3xl font-bold uppercase tracking-tight">
              Display Heading
            </h1>
            <p className="text-foreground">
              Body text — IBM Plex Sans. Used for descriptions and content.
            </p>
            <p className="text-sm text-muted-foreground">
              Muted secondary text for subtitles and metadata.
            </p>
          </div>
        </section>

        <section>
          <AppSectionHeading>Buttons</AppSectionHeading>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-sm">Primary</Button>
            <Button variant="outline" className="rounded-sm">
              Outline
            </Button>
            <Button variant="secondary" className="rounded-sm">
              Secondary
            </Button>
            <Button variant="tertiary" className="rounded-sm">
              Tertiary
            </Button>
            <Button variant="destructive" className="rounded-sm">
              Destructive
            </Button>
            <Button variant="ghost" className="rounded-sm">
              Ghost
            </Button>
          </div>
        </section>

        <section>
          <AppSectionHeading>Badges</AppSectionHeading>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="border-primary/40 bg-primary/15 text-primary">
              Verified
            </Badge>
          </div>
        </section>

        <section>
          <AppSectionHeading>AppCard</AppSectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <AppCard>
              <CardContent className="p-4">
                <p className="font-semibold">Standard card</p>
                <p className="text-sm text-muted-foreground">
                  Flat border, hover highlights primary.
                </p>
              </CardContent>
            </AppCard>
            <AppCard featured>
              <CardContent className="p-4">
                <p className="font-semibold">Featured card</p>
                <p className="text-sm text-muted-foreground">
                  Primary border emphasis.
                </p>
              </CardContent>
            </AppCard>
          </div>
        </section>

        <section>
          <AppSectionHeading>AppAlert</AppSectionHeading>
          <div className="space-y-3">
            <AppAlert variant="pending" icon={<Clock className="h-4 w-4" />}>
              Pending approval — establishment not yet visible to the public.
            </AppAlert>
            <AppAlert variant="rejected">
              This establishment was not approved.
            </AppAlert>
            <AppAlert variant="success">
              Listing published successfully.
            </AppAlert>
          </div>
        </section>

        <section>
          <AppSectionHeading>PageHeader + Toolbar</AppSectionHeading>
          <div className="rounded-sm border border-border p-6">
            <AppPageToolbar
              backHref="/marketplace"
              actions={
                <Button size="sm">
                  <Star className="mr-2 h-4 w-4" />
                  Action
                </Button>
              }
            />
            <PageHeader
              title="Example Page"
              description="PageHeader with backHref lives above the title border."
              actions={<Button>Create Listing</Button>}
              className="mb-0 border-b-0 pb-0"
            />
          </div>
        </section>

        <section>
          <AppSectionHeading>Form controls</AppSectionHeading>
          <div className="max-w-sm space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ds-input">Input</Label>
              <Input id="ds-input" placeholder="Search listings..." />
            </div>
          </div>
        </section>

        <section>
          <AppSectionHeading>Prose</AppSectionHeading>
          <div className="prose prose-sm max-w-none text-foreground">
            <h2>Legal section heading</h2>
            <p>
              Body copy with a <Link href="/terms">link to terms</Link> for
              policy pages.
            </p>
          </div>
        </section>
      </div>
    </PageLayout>
  )
}
