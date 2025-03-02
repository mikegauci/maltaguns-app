"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Calendar, User, Store, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import Link from "next/link"

interface BlogPost {
  id: string
  title: string
  content: string
  featured_image: string | null
  created_at: string
  author: {
    username: string
  }
  retailer_id: string
}

interface Retailer {
  id: string
  business_name: string
  logo_url: string | null
}

export default function RetailerBlogPostPage({ params }: { params: { id: string, slug: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [retailer, setRetailer] = useState<Retailer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        
        // Fetch blog post from retailer_blog_posts table
        const { data: postData, error: postError } = await supabase
          .from("retailer_blog_posts")
          .select("*")
          .eq("slug", params.slug)
          .eq("retailer_id", params.id)
          .single()

        if (postError) {
          throw postError;
        }
        
        if (!postData) {
          router.push(`/retailers/${params.id}`);
          return;
        }

        // Add default author information
        const postWithAuthor = {
          ...postData,
          author: { username: "Author" }
        };

        setPost(postWithAuthor);

        // Fetch retailer details
        const { data: retailerData, error: retailerError } = await supabase
          .from("retailers")
          .select("id, business_name, logo_url, owner_id")
          .eq("id", params.id)
          .single()

        if (retailerError) {
          throw retailerError;
        }
        
        setRetailer(retailerData)

        // Check if user is the owner
        if (session?.user && retailerData.owner_id === session.user.id) {
          setIsOwner(true)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        router.push(`/retailers/${params.id}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, params.slug, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    )
  }

  if (!post || !retailer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/retailers/${params.id}`)}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {retailer.business_name}
          </Button>

          {isOwner && (
            <Link href={`/retailers/${params.id}/blog/${params.slug}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Post
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {post.featured_image && (
              <div className="w-full h-[300px] relative overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <Link href={`/retailers/${params.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Store className="h-4 w-4" />
                  <span>{retailer.business_name}</span>
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(post.created_at), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{post.author.username}</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 