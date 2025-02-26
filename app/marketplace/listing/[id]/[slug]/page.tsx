import { supabase } from "@/lib/supabase";
import ListingClient from "./listing-client";
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

export default async function ListingPage({ params }: { params: { id: string; slug: string } }) {
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
    )
    .eq("id", params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <ListingClient listing={data as ListingDetails} />;
}
