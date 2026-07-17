import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { HomeCarousel, HomeCarouselItem } from './HomeCarousel'

interface BlogPost {
  id: string
  title: string
  category: string
  slug: string
  featured_image: string | null
  created_at: string
  author: {
    username: string
  }
}

interface LatestArticlesSectionProps {
  posts: BlogPost[]
}

export const LatestArticlesSection = ({
  posts,
}: LatestArticlesSectionProps) => {
  return (
    <section className="py-16 bg-accent/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Latest Articles</h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Stay informed and get expert advice on firearm maintenance, safety,
            and more.
          </p>
        </div>

        {posts.length > 0 ? (
          <HomeCarousel>
            {posts.slice(0, 10).map(post => (
              <HomeCarouselItem key={post.id}>
                <Link
                  href={`/blog/${post.category}/${post.slug}`}
                  className="block h-full"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    {post.featured_image ? (
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <BookOpen className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-2.5 md:p-4 text-center md:text-left">
                      <h3 className="font-semibold text-sm md:text-lg mb-1.5 md:mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <div className="flex flex-col md:flex-row items-center md:justify-between gap-0.5 md:gap-0 text-xs md:text-sm text-muted-foreground">
                        <span>By {post.author.username}</span>
                        <span>
                          {format(new Date(post.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </HomeCarouselItem>
            ))}
          </HomeCarousel>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Link href="/blog">
            <Button>View All Articles</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
