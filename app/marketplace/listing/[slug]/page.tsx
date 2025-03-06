import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

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
  };
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
  
  // Fetch all listings and filter by slug
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        *,
        seller:profiles (
          username,
          email,
          phone
        )
      `
    );

  if (error || !data || data.length === 0) {
    console.log("No listings found or error:", error);
    notFound();
  }

  // Find the best match by comparing the slugified title with the provided slug
  const bestMatch = data.find(listing => {
    const listingSlug = listing.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
    
    console.log(`Comparing: "${listingSlug}" with "${slug}"`);
    
    return listingSlug === slug || listingSlug.includes(slug) || slug.includes(listingSlug);
  });

  if (!bestMatch) {
    console.log("No matching listing found for slug:", slug);
    notFound();
  }

  console.log("Found matching listing:", bestMatch.title);

  // Use the listing-client component directly
  const ListingClient = (await import("./listing-client")).default;

  return <ListingClient listing={bestMatch as ListingDetails} />;
} 