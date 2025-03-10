import { supabase } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function EventEditPage({ params }: { params: { slug: string } }) {
  // First try to find the event by slug
  let { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .single();

  // If not found by slug, try to find by ID (for backward compatibility)
  if (error || !event) {
    const { data: eventById, error: errorById } = await supabase
      .from("events")
      .select("*")
      .eq("id", params.slug)
      .single();
    
    if (errorById || !eventById) {
      notFound();
    }
    
    event = eventById;
  }

  // For now, redirect to the event page
  // This is a placeholder until the edit functionality is implemented
  return redirect(`/events/${event.slug || event.id}`);
} 