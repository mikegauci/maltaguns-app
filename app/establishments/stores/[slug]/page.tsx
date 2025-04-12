import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import StoreClient from "./store-client";
import { headers } from "next/headers";

interface Store {
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

interface StoreDetails extends Store {
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
    category: string;
    author: {
      username: string;
    };
  }[];
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0; // Disable cache

export default async function StorePage({ params }: { params: { slug: string } }) {
  // Force cache revalidation
  headers();
  
  // Fetch store details
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  console.log(`Found store: ${store.business_name} (ID: ${store.id})`);

  // Fetch store's listings
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", store.owner_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (listingsError) {
    console.error("Error fetching listings:", listingsError);
  }

  // Fetch blog posts from blog_posts table with store_id filter
  console.log(`Fetching blog posts for store ID: ${store.id}`);
  let { data: blogPosts, error: blogPostsError } = await supabase
    .from("blog_posts")
    .select(`
      id,
      title,
      slug,
      content,
      featured_image,
      created_at,
      category,
      store_id,
      author:profiles(username)
    `)
    .eq("store_id", store.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (blogPostsError) {
    console.error(`Store blog posts fetch error for ${store.business_name}: ${blogPostsError.message}`);
  } else {
    console.log(`Found ${blogPosts?.length || 0} blog posts for ${store.business_name}`);
  }

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      console.log(`Trying admin client for store ID: ${store.id}`);
      const { data: adminBlogPosts, error: adminError } = await supabaseAdmin
        .from("blog_posts")
        .select(`
          id,
          title,
          slug,
          content,
          featured_image,
          created_at,
          category,
          store_id,
          author:profiles(username)
        `)
        .eq("store_id", store.id)
        .eq("published", true)
        .order("created_at", { ascending: false });
      
      if (!adminError && adminBlogPosts && adminBlogPosts.length > 0) {
        console.log(`Found ${adminBlogPosts.length} blog posts with admin client`);
        blogPosts = adminBlogPosts;
        blogPostsError = null;
      } else if (adminError) {
        console.error(`Admin client error: ${adminError.message}`);
      } else {
        console.log("No blog posts found with admin client");
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
      author: post.author || { username: "Author" },
      category: post.category || "news" // Ensure category always has a value
    };
  });

  const storeDetails: StoreDetails = {
    ...store,
    listings: listings || [],
    blogPosts: processedBlogPosts
  };

  return <StoreClient store={storeDetails} />;
} 