import { supabase } from "@/lib/supabase";
import EventClient from "./event-client";
import { notFound } from "next/navigation";

interface Event {
  id: string;
  title: string;
  description: string;
  organizer: string;
  type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  phone: string | null;
  email: string | null;
  price: number | null;
  poster_url: string | null;
  created_by: string;
  slug: string | null;
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function EventPage({ params }: { params: { slug: string } }) {
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

  return <EventClient event={event as Event} />;
}