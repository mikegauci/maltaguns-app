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
  slug: string
}

export default function RetailerBlogPostPage({ params }: { params: { slug: string, postSlug: string } }) {
  const retailerSlug = params.slug;
  const postSlug = params.postSlug;
  
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
        
        // First fetch the retailer to get its ID
        const { data: retailerData, error: retailerError } = await supabase
          .from("retailers")
          .select("*")
          .eq("slug", retailerSlug)
          .single()
          
        if (retailerError || !retailerData) {
          console.error("Error fetching retailer:", retailerError)
          router.push("/retailers")
          return
        }
        
        setRetailer(retailerData)
        
        // Fetch blog post from retailer_blog_posts table
        const { data: postData, error: postError } = await supabase
          .from("retailer_blog_posts")
          .select("*")
          .eq("slug", postSlug)
          .eq("retailer_id", retailerData.id)
          .single()

        if (postError) {
          throw postError;
        }
        
        if (!postData) {
          router.push(`/retailers/${retailerData.slug}`);
          return;
        }

        // Add default author information
        const postWithAuthor = {
          ...postData,
          author: { username: "Author" }
        };

        setPost(postWithAuthor);

        // Check if user is the owner
        if (session?.user && retailerData.owner_id === session.user.id) {
          setIsOwner(true)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        router.push(`/retailers/${retailer?.slug || ''}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [retailerSlug, postSlug, router])

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
            onClick={() => router.push(`/retailers/${retailer.slug}`)}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {retailer.business_name}
          </Button>

          {isOwner && (
            <Link href={`/retailers/${retailer.slug}/blog/${params.postSlug}/edit`}>
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
                <Link href={`/retailers/${retailer.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
                className="prose max-w-none prose-a:text-red-600 prose-a:hover:text-red-800"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 