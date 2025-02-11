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
}

// Force dynamic rendering (disable static export)
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function EventPage({ params }: { params: { id: string } }) {
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !event) {
    notFound();
  }

  return <EventClient event={event as Event} />;
}