import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ListingClient from "./listing-client";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  calibre?: string;
  type: "firearms" | "non_firearms";
  thumbnail: string;
  seller_id: string;
  created_at: string;
}

interface ListingDetails extends Listing {
  seller: {
    username: string;
    email: string | null;
    phone: string | null;
    contact_preference?: "email" | "phone" | "both";
  } | null;
  images: string[];
  status: string;
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function ListingPage({ params }: { params: { slug: string } }) {
  // Extract the slug from params
  const { slug } = params;
  
  console.log("Searching for slug:", slug);
  
  // Check if the slug contains an ID (format: id/title)
  const slugParts = slug.split('/');
  let listingId: string | null = null;
  let titleSlug: string = slug;
  
  if (slugParts.length > 1) {
    // If the slug has multiple parts, the first part is the ID
    listingId = slugParts[0];
    titleSlug = slugParts.slice(1).join('/');
    console.log(`Detected ID: ${listingId}, Title slug: ${titleSlug}`);
  }
  
  // If we have an ID, fetch by ID first
  if (listingId) {
    try {
      // First, get the listing without the seller join
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select('*')
        .eq('id', listingId)
        .single();
        
      if (listingError) {
        console.error("Error fetching listing by ID:", listingError);
      } else if (listingData) {
        console.log("Found listing by ID:", listingData.title);
        
        // Then get the seller info separately
        const { data: sellerData, error: sellerError } = await supabase
          .from("profiles")
          .select('username, email, phone, contact_preference')
          .eq('id', listingData.seller_id)
          .single();
          
        if (sellerError) {
          console.error("Error fetching seller:", sellerError);
        }
        
        // Combine the data
        const completeListingData: ListingDetails = {
          ...listingData,
          seller: sellerData || null,
          images: typeof listingData.images === 'string' 
            ? parseImageUrls(listingData.images) 
            : []
        };
        
        return <ListingClient listing={completeListingData} />;
      }
    } catch (error) {
      console.error("Error in ID lookup:", error);
    }
    
    console.log("Listing not found by ID, falling back to slug search");
  }
  
  // Fetch all listings for slug search
  try {
    const { data: listingsData, error: listingsError } = await supabase
      .from("listings")
      .select('*');
      
    if (listingsError) {
      console.error("Error fetching listings:", listingsError);
      notFound();
    }
    
    if (!listingsData || listingsData.length === 0) {
      console.log("No listings found");
      notFound();
    }
    
    // Find the best match by comparing the slugified title with the provided slug
    const bestMatch = listingsData.find(listing => {
      const listingSlug = slugify(listing.title);
      console.log(`Comparing: "${listingSlug}" with "${titleSlug}"`);
      return listingSlug === titleSlug || listingSlug.includes(titleSlug) || titleSlug.includes(listingSlug);
    });
    
    if (!bestMatch) {
      console.log("No matching listing found for slug:", titleSlug);
      notFound();
    }
    
    console.log("Found matching listing:", bestMatch.title);
    
    // Get the seller info separately
    const { data: sellerData, error: sellerError } = await supabase
      .from("profiles")
      .select('username, email, phone, contact_preference')
      .eq('id', bestMatch.seller_id)
      .single();
      
    if (sellerError) {
      console.error("Error fetching seller:", sellerError);
    }
    
    // Combine the data
    const completeListingData: ListingDetails = {
      ...bestMatch,
      seller: sellerData || null,
      images: typeof bestMatch.images === 'string' 
        ? parseImageUrls(bestMatch.images) 
        : []
    };
    
    return <ListingClient listing={completeListingData} />;
  } catch (error) {
    console.error("Error in slug search:", error);
    notFound();
  }
}

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

// Helper function to parse image URLs from PostgreSQL array string
function parseImageUrls(images: string): string[] {
  try {
    // Handle PostgreSQL array format: {"url1","url2"}
    if (images.startsWith('{') && images.endsWith('}')) {
      // Remove the curly braces and split by commas
      const content = images.substring(1, images.length - 1);
      // Handle empty array
      if (!content) return [];
      
      // Split by commas, but respect quotes
      return content.split(',')
        .map(url => url.trim())
        .map(url => url.startsWith('"') && url.endsWith('"') 
          ? url.substring(1, url.length - 1) 
          : url);
    }
    
    // Try parsing as JSON if it's not in PostgreSQL format
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If all else fails, return an empty array
      return [];
    }
  } catch (error) {
    console.error("Error parsing image URLs:", error);
    return [];
  }
} 