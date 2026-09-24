'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import type { HelpTabContent } from '@/lib/help-center'
import { sanitizeBlogHtml } from '@/lib/sanitize-html'

type HelpCenterTabsProps = {
  tabs: HelpTabContent[]
}

const tabGridClass: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
}

export function HelpCenterTabs({ tabs }: HelpCenterTabsProps) {
  if (!tabs.length) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Help content is being updated. Please check back soon.
      </p>
    )
  }

  const defaultTab = tabs[0].slug
  const gridClass = tabGridClass[Math.min(tabs.length, 6)] ?? 'sm:grid-cols-6'

  return (
    <Tabs defaultValue={defaultTab} className="mb-12">
      <TabsList
        className={`flex flex-col sm:grid ${gridClass} w-full h-full sm:h-auto gap-2 sm:gap-0`}
      >
        {tabs.map(tab => (
          <TabsTrigger className="w-full" key={tab.id} value={tab.slug}>
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.id} value={tab.slug} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tab.section_title}</CardTitle>
              {tab.section_description ? (
                <CardDescription>{tab.section_description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {tab.banner_text ? (
                <div className="mb-6 rounded-sm border border-border bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Disclaimer:</strong> {tab.banner_text}
                  </p>
                </div>
              ) : null}

              {tab.guides.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {tab.guides.map(guide => (
                    <div
                      key={guide.id}
                      className="border rounded-lg p-5 hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">{guide.title}</h3>
                      </div>
                      {guide.description ? (
                        <p className="text-sm text-muted-foreground mb-4">
                          {guide.description}
                        </p>
                      ) : null}
                      <Link href={`/help/guides/${guide.slug}`}>
                        <Button variant="outline" size="sm">
                          View Guide
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab.faqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {tab.faqs.map(faq => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeBlogHtml(faq.answer),
                          }}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}
