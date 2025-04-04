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
  featured_image: string
  author_id: string
  published: boolean
  created_at: string
  author: {
    username: string
  }
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic"
export const dynamicParams = true

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:profiles(username)
      `)
      .eq("slug", params.slug)
      .eq("published", true)
      .single()

    if (error) {
      console.error('Error fetching blog post:', error)
      notFound()
    }

    if (!post) {
      console.log('Blog post not found:', params.slug)
      notFound()
    }

    return <BlogPostClient post={post as BlogPost} />
  } catch (error) {
    console.error('Error in BlogPostPage:', error)
    notFound()
  }
}