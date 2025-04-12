import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface BlogPost {
  id: string
  title: string
  slug: string
  featured_image: string | null
  created_at: string
  category: string
  author_id: string
}

interface BlogPostCardProps {
  post: BlogPost
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${post.category}/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow duration-200">
        {post.featured_image && (
          <div className="relative w-full aspect-video">
            <img
              src={post.featured_image}
              alt={post.title}
              className="object-cover w-full h-full rounded-t-lg"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">
              {post.category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          <h2 className="text-xl font-semibold line-clamp-2">{post.title}</h2>
        </CardHeader>
      </Card>
    </Link>
  )
} 