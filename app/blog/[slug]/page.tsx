import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import BlogPostClient from "./post-client";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  featured_image: string;
  author_id: string;
  published: boolean;
  created_at: string;
  author: {
    username: string;
  };
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select(`
      *,
      author:profiles(username)
    `)
    .eq("slug", params.slug)
    .eq("published", true)
    .single();

  if (error || !post) {
    notFound();
  }

  return <BlogPostClient post={post as BlogPost} />;
}