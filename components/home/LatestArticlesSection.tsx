import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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

export const LatestArticlesSection = ({ posts }: LatestArticlesSectionProps) => {
  return (
    <section className="py-16 bg-accent/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Latest Articles</h2>
          <p className="text-lg text-muted-foreground">
            Stay informed and get expert advice on firearm maintenance,
            safety, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.category}/${post.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>By {post.author.username}</span>
                    <span>
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/blog">
            <Button>View All Articles</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

