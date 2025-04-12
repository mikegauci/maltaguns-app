import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from "next/navigation"
import { Database } from "@/lib/database.types"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  author_id: string
  published: boolean
  created_at: string
  author: {
    username: string
  }
  retailer?: {
    id: string
    business_name: string
    slug: string
    logo_url: string | null
  }
}

type SupabaseResponse = {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  published: boolean
  created_at: string
  author_id: string
  author: {
    username: string
  } | null
  retailer: {
    id: string
    business_name: string
    slug: string
    logo_url: string | null
  }[] | null
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic"
export const dynamicParams = true

export default async function BlogPost({ params }: { params: { category: string; slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const { data: post, error } = await supabase
    .from("blog_posts")
    .select(`
      id,
      title,
      content,
      slug,
      featured_image,
      published,
      created_at,
      author_id,
      profiles!blog_posts_author_id_fkey(username),
      retailer:stores(id, business_name, slug, logo_url)
    `)
    .eq("slug", params.slug)
    .eq("category", params.category)
    .eq("published", true)
    .single()

  if (error || !post) {
    notFound()
  }
  
  // Convert the post to the expected interface
  const blogPost: BlogPost = {
    id: post.id,
    title: post.title,
    content: post.content,
    slug: post.slug,
    featured_image: post.featured_image,
    published: post.published,
    created_at: post.created_at,
    author_id: post.author_id,
    author: { username: post.profiles?.[0]?.username || 'Unknown' },
    retailer: post.retailer?.[0] || undefined
  }

  // Get current session to check if user can edit
  const { data: { session } } = await supabase.auth.getSession()
  const canEdit = session?.user.id === post.author_id

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-screen-lg mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <Link href="/blog" className="text-muted-foreground hover:text-foreground">
            ← Back to blog
          </Link>
          {canEdit && (
            <Link href={`/blog/${params.category}/${params.slug}/edit`}>
              <Button>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Post
              </Button>
            </Link>
          )}
        </div>

        <article className="prose prose-neutral dark:prose-invert prose-strong:text-[#0a0a0a] prose-b:text-[#0a0a0a] mx-auto">
          {post.featured_image && (
            <div className="mb-8">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-[550px] object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="mb-8">
            <h1 className="mb-4">{blogPost.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>By {blogPost.author.username}</span>
              <span>•</span>
              <span>{new Date(post.created_at).toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
              <span>•</span>
              <Link 
                href={`/blog/${params.category}`}
                className="text-primary hover:text-primary/80"
              >
                {params.category.charAt(0).toUpperCase() + params.category.slice(1)}
              </Link>
            </div>
          </div>

          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
      </div>
    </div>
  )
}