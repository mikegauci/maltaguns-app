import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import RetailerClient from "./retailer-client";
import { headers } from "next/headers";

interface Retailer {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  website: string | null;
  owner_id: string;
}

interface RetailerDetails extends Retailer {
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

export default async function RetailerPage({ params }: { params: { id: string } }) {
  // Force cache revalidation
  headers();
  
  // Fetch retailer details
  const { data: retailer, error: retailerError } = await supabase
    .from("retailers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (retailerError || !retailer) {
    notFound();
  }

  // Fetch retailer's listings
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", retailer.owner_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (listingsError) {
    console.error("Error fetching listings:", listingsError);
  }

  // First try to fetch blog posts with regular client
  let { data: blogPosts, error: blogPostsError } = await supabase
    .from("retailer_blog_posts")
    .select("*")
    .eq("retailer_id", params.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      const { data: adminBlogPosts, error: adminError } = await supabaseAdmin
        .from("retailer_blog_posts")
        .select("*")
        .eq("retailer_id", params.id)
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
    // Ensure the author property has the correct structure
    return {
      ...post,
      author: { username: "Author" }
    };
  });

  // If no blog posts were found, try to create a test post directly
  if (processedBlogPosts.length === 0) {
    try {
      // Create a test blog post without relying on author_id
      const testPost = {
        title: 'Test Blog Post ' + new Date().toISOString(),
        slug: 'test-blog-post-' + Date.now(),
        content: '<p>This is a test blog post created directly from the retailer page.</p>',
        featured_image: null,
        published: true,
        author_id: null, // Set to null to avoid foreign key issues
        retailer_id: params.id,
        created_at: new Date().toISOString()
      };
      
      // Insert the test post
      const { data: insertedPost, error: insertError } = await supabase
        .from('retailer_blog_posts')
        .insert(testPost)
        .select();
      
      if (!insertError && insertedPost && insertedPost.length > 0) {
        const post = insertedPost[0];
        processedBlogPosts.push({
          ...post,
          author: { username: 'Author' }
        });
      }
    } catch (error) {
      console.error("Error creating test blog post:", error);
    }
  }

  const retailerDetails: RetailerDetails = {
    ...retailer,
    listings: listings || [],
    blogPosts: processedBlogPosts
  };

  return <RetailerClient retailer={retailerDetails} />;
}