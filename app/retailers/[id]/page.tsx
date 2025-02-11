import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import RetailerClient from "./retailer-client";

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
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function RetailerPage({ params }: { params: { id: string } }) {
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

  const retailerDetails: RetailerDetails = {
    ...retailer,
    listings: listings || []
  };

  return <RetailerClient retailer={retailerDetails} />;
}