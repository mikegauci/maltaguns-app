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

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // The slug could be a UUID (when coming from a redirect) or a text slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let listingData;
  
  if (isUuid) {
    // If it's a UUID, look up by ID directly
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        seller:profiles(username, email, phone, contact_preference)
      `
      )
      .eq("id", slug)
      .single();

    if (error || !data) {
      console.error("Error fetching listing by ID:", error);
      notFound();
    }
    
    listingData = data;
  } else {
    // If it's a normal slug, look up by comparing with titles
    // Get all listings
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        seller:profiles(username, email, phone, contact_preference)
      `
      );

    if (error || !data) {
      console.error("Error fetching listings:", error);
      notFound();
    }

    // Find the listing with a matching slug
    listingData = data.find((listing) => slugify(listing.title) === slug);

    if (!listingData) {
      console.error("No listing found with slug:", slug);
      notFound();
    }
  }

  // Process the images field from JSON string if needed
  let processedImages: string[] = [];

  if (typeof listingData.images === "string") {
    try {
      // Try to parse as JSON first
      processedImages = JSON.parse(listingData.images);
    } catch (e) {
      // If not valid JSON, try parsing as a comma-separated string
      processedImages = parseImageUrls(listingData.images);
    }
  } else if (Array.isArray(listingData.images)) {
    // If already an array, use as is
    processedImages = listingData.images;
  }

  // Create the final listing object with processed images
  const listing: ListingDetails = {
    ...listingData,
    images: processedImages,
  };

  return <ListingClient listing={listing} />;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

function parseImageUrls(images: string): string[] {
  // Handle different formats of comma-separated strings
  if (images.startsWith("{") && images.endsWith("}")) {
    // PostgreSQL array format: {url1,url2,url3}
    return images
      .substring(1, images.length - 1)
      .split(",")
      .map((url) => url.trim().replace(/^"(.*)"$/, "$1"));
  }
  
  // Simple comma-separated list
  return images.split(",").map((url) => url.trim());
} 