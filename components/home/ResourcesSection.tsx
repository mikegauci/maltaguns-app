import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Globe } from 'lucide-react'
import Link from 'next/link'

export const ResourcesSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Need Help?</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Need help? Check out our comprehensive <strong>guides</strong> and
            stay updated with the latest <strong>news</strong> and regulations
            for firearm owners in Malta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-8">
          <Link href="/blog/guides">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-2 md:p-6 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="rounded-lg bg-[#cb0e0e] p-2 md:p-3 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-3 md:mb-4">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm md:text-lg mb-3">
                  Guides & Resources
                </h3>
                <p className="text-xs md:text-base text-muted-foreground mb-4">
                  Access comprehensive guides on licensing, safety regulations,
                  and maintenance tips for firearm owners in Malta.
                </p>
                <div className="flex items-center justify-center md:justify-start text-sm text-primary">
                  <span className="mr-2">Browse guides</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform transform group-hover:translate-x-1"
                  >
                    <path
                      d="M6.66667 12.6667L12 7.33333L6.66667 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/blog/news">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-2 md:p-6 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="rounded-lg bg-[#cb0e0e] p-2 md:p-3 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-3 md:mb-4">
                  <Globe className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm md:text-lg mb-3">
                  Latest News
                </h3>
                <p className="text-xs md:text-base text-muted-foreground mb-4">
                  Stay updated with the latest news, regulations, and
                  announcements affecting the firearms community in Malta.
                </p>
                <div className="flex items-center justify-center md:justify-start text-sm text-primary">
                  <span className="mr-2">Read news</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform transform group-hover:translate-x-1"
                  >
                    <path
                      d="M6.66667 12.6667L12 7.33333L6.66667 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  )
}
