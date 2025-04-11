import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from "next/navigation"
import BlogPostClient from "./post-client"
import { Database } from "@/lib/database.types"

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
  }
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

export default async function BlogPost({ params }: { params: { slug: string } }) {
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
      author:profiles!blog_posts_author_id_fkey(username),
      retailer:stores(id, business_name, slug, logo_url)
    `)
    .eq("slug", params.slug)
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
    author: { username: (post as unknown as SupabaseResponse).author?.username || 'Unknown' },
    retailer: (post as unknown as SupabaseResponse).retailer?.[0] || undefined
  }

  return <BlogPostClient post={blogPost} />
}