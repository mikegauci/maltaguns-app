"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Pencil } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"

interface BlogPost {
  id: string
  title: string
  content: string
  featured_image: string | null
  published: boolean
  created_at: string
  author_id: string
  author: {
    username: string
  }
}

export default function BlogPostClient({ post }: { post: BlogPost }) {
  const router = useRouter()
  const [isAuthor, setIsAuthor] = useState(false)

  useEffect(() => {
    async function checkAuthor() {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthor(session?.user?.id === post.author_id)
    }

    checkAuthor()
  }, [post.author_id])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/blog")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Button>

          {isAuthor && (
            <Button
              variant="outline"
              onClick={() => router.push(`/blog/${post.slug}/edit`)}
              className="flex items-center"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Post
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Featured Image */}
            {post.featured_image ? (
              <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : null}

            {/* Post Header */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">{post.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>By {post.author.username}</span>
                <span>•</span>
                <span>{format(new Date(post.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </div>

            {/* Post Content */}
            <div 
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}