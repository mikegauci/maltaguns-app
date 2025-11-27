import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Globe } from 'lucide-react'
import Link from 'next/link'

export const ResourcesSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Need Help?</h2>
          <p className="text-lg text-muted-foreground">
            Need help? Check out our comprehensive <strong>guides</strong> and
            <br />
            stay updated with the latest <strong>news</strong> and regulations
            for firearm owners in Malta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/guides">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-6">
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-3">
                  Guides & Resources
                </h3>
                <p className="text-muted-foreground mb-4">
                  Access comprehensive guides on licensing, safety regulations,
                  and maintenance tips for firearm owners in Malta.
                </p>
                <div className="flex items-center text-sm text-primary">
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

          <Link href="/news">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-6">
                <div className="rounded-lg bg-[#cb0e0e] p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-3">Latest News</h3>
                <p className="text-muted-foreground mb-4">
                  Stay updated with the latest news, regulations, and
                  announcements affecting the firearms community in Malta.
                </p>
                <div className="flex items-center text-sm text-primary">
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
