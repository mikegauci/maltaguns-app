import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ServicingClient from "./servicing-client";
interface Servicing {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  website: string | null;
  owner_id: string;
  slug: string;
}

interface ServicingDetails extends Servicing {
  listings: {
    id: string;
    title: string;
    type: 'firearms' | 'non_firearms';
    category: string;
    price: number;
    thumbnail: string;
    created_at: string;
  }[];
  blogPosts: {
    id: string;
    title: string;
    slug: string;
    content: string;
    featured_image: string | null;
    created_at: string;
    author: {
      username: string;
    };
  }[];
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0; // Disable cache

export default async function ServicingPage({ params }: { params: { slug: string } }) {
  // Force cache revalidation
  headers();
  
  // Fetch servicing details
  const { data: servicing, error: servicingError } = await supabase
    .from("servicing")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (servicingError || !servicing) {
    notFound();
  }

  // Fetch servicing's listings
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", servicing.owner_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (listingsError) {
    console.error("Error fetching listings:", listingsError);
  }

  // Fetch blog posts from blog_posts table with servicing_id filter
  let { data: blogPosts, error: blogPostsError } = await supabase
    .from("blog_posts")
    .select("*, author:profiles(username)")
    .eq("servicing_id", servicing.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      const { data: adminBlogPosts, error: adminError } = await supabaseAdmin
        .from("blog_posts")
        .select("*, author:profiles(username)")
        .eq("servicing_id", servicing.id)
        .eq("published", true)
        .order("created_at", { ascending: false });
      
      if (!adminError && adminBlogPosts && adminBlogPosts.length > 0) {
        blogPosts = adminBlogPosts;
        blogPostsError = null;
      }
    } catch (error) {
      console.error("Error using admin client:", error);
    }
  }

  // Process blog posts to ensure they have the correct structure
  const processedBlogPosts = (blogPosts || []).map(post => {
    // Ensure the author property exists and has the correct structure
    return {
      ...post,
      author: post.author || { username: "Author" }
    };
  });

  const servicingDetails: ServicingDetails = {
    ...servicing,
    listings: listings || [],
    blogPosts: processedBlogPosts
  };

  return <ServicingClient servicing={servicingDetails} />;
} 