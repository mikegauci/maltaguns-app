'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Pencil, Trash2, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { BlogPost } from '../../app/profile/types'

interface MyBlogPostsProps {
  blogPosts: BlogPost[]
  handleDeletePost: (postId: string) => Promise<void>
}

export const MyBlogPosts = ({
  blogPosts,
  handleDeletePost,
}: MyBlogPostsProps) => {
  if (blogPosts.length === 0) return null

  return (
    <AppCard>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
          <div>
            <CardTitle>My Blog Posts</CardTitle>
            <CardDescription>Manage your blog posts</CardDescription>
          </div>
          <Link href="/blog/create" className="mt-4 sm:mt-0 w-full sm:w-auto">
            <Button className="w-full">
              <BookOpen className="h-4 w-4 mr-2" />
              Write Post
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {blogPosts.map(post => (
            <AppCard key={post.id}>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-semibold">{post.title}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(post.created_at), 'PPP')}
                      </p>
                      <Badge variant={post.published ? 'default' : 'secondary'}>
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/blog/${post.category}/${post.slug}`}
                      className="w-full sm:w-auto"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Link
                      href={`/blog/${post.category}/${post.slug}/edit`}
                      className="w-full sm:w-auto"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </AppCard>
          ))}
        </div>
      </CardContent>
    </AppCard>
  )
}
