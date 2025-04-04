"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Shield,
  AlertCircle,
  Pencil,
  Upload,
  Package,
  Sun as Gun,
  Eye,
  Store,
  BookOpen,
  Trash2,
  RefreshCw,
  X,
  Info,
  ArrowLeft,
  CheckCircle,
  Mail,
  Phone,
  Star,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeatureCreditDialog } from "@/components/feature-credit-dialog";
import { CreditDialog } from "@/components/credit-dialog";
import { EventCreditDialog } from "@/components/event-credit-dialog";
import { useSupabase } from "@/components/providers/supabase-provider";
import { LoadingState } from "@/components/ui/loading-state";
import Image from "next/image";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
}

interface RetailerBlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
  retailer_id: string;
}

interface Listing {
  id: string;
  title: string;
  type: "firearms" | "non_firearms";
  category: string;
  price: number;
  status: string;
  created_at: string;
  expires_at: string;
  is_near_expiration?: boolean;
  is_featured?: boolean;
  days_until_expiration?: number;
  featured_days_remaining?: number;
  is_expired: boolean;
}

interface Retailer {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
  slug: string;
}

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
  poster_url: string | null;
  phone: string | null;
  email: string | null;
  price: number | null;
  created_at: string;
  slug: string | null;
}

const profileSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-MT", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { supabase, session } = useSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [retailerBlogPosts, setRetailerBlogPosts] = useState<
    RetailerBlogPost[]
  >([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [listingToFeature, setListingToFeature] = useState<string | null>(null);
  const [removeFeatureDialogOpen, setRemoveFeatureDialogOpen] = useState(false);
  const [listingToRemoveFeature, setListingToRemoveFeature] = useState<
    string | null
  >(null);
  const [listingCredits, setListingCredits] = useState(0);
  const [eventCredits, setEventCredits] = useState(0);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showEventCreditDialog, setShowEventCreditDialog] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        // Only load profile data if user is logged in
        if (session?.user) {
          setLoading(true);
          const userId = session.user.id;
          console.log("Loading profile for user ID:", userId);

          // Fetch profile first
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (profileError) {
            console.error("Profile fetch error:", profileError.message);
            throw profileError;
          }

          // Set profile data immediately
          setProfile(profileData);
          form.reset({
            phone: profileData.phone || "",
            address: profileData.address || "",
          });

          // Fetch user's listings
          const { data: listingsData, error: listingsError } = await supabase
            .from("listings")
            .select("*")
            .eq("seller_id", userId)
            .order("created_at", { ascending: false });

          if (listingsError) {
            console.error("Listings fetch error:", listingsError.message);
            // Continue even if there's an error
          }

          // Fetch featured listings data
          const { data: featuredListingsData, error: featuredListingsError } =
            await supabase
              .from("featured_listings")
              .select("*")
              .eq("user_id", userId);

          if (featuredListingsError) {
            console.error(
              "Featured listings fetch error:",
              featuredListingsError.message
            );
          }

          // Create a map of listing IDs to their featured end dates
          const featuredEndDates = new Map(
            (featuredListingsData || []).map((featured) => [
              featured.listing_id,
              new Date(featured.end_date),
            ])
          );

          // Process listings to add feature status and expiration data
          const listingsWithFeatures = (listingsData || []).map(
            (listing: any) => {
              const now = new Date();
              const expirationDate = new Date(listing.expires_at);
              const featuredEndDate = featuredEndDates.get(listing.id);

              const diffTime = expirationDate.getTime() - now.getTime();
              const daysUntilExpiration = Math.ceil(
                diffTime / (1000 * 60 * 60 * 24)
              );

              let featuredDaysRemaining = 0;
              if (featuredEndDate && featuredEndDate > now) {
                const featuredDiffTime =
                  featuredEndDate.getTime() - now.getTime();
                featuredDaysRemaining = Math.max(
                  0,
                  Math.ceil(featuredDiffTime / (1000 * 60 * 60 * 24))
                );
              }

              return {
                ...listing,
                is_featured: featuredEndDate ? featuredEndDate > now : false,
                days_until_expiration: daysUntilExpiration,
                featured_days_remaining: featuredDaysRemaining,
                is_near_expiration:
                  daysUntilExpiration <= 3 && daysUntilExpiration > 0,
                is_expired: daysUntilExpiration <= 0,
              };
            }
          );

          // Filter out expired listings as they'll be deleted soon
          const activeListings = listingsWithFeatures.filter(
            (listing) => !listing.is_expired
          );
          setListings(activeListings);

          // Fetch user's blog posts
          const { data: blogData, error: blogError } = await supabase
            .from("blog_posts")
            .select("id, title, slug, published, created_at")
            .eq("author_id", userId)
            .order("created_at", { ascending: false });

          if (blogError) {
            console.error("Blog posts fetch error:", blogError.message);
            // Continue even if there's an error
          }

          // SIMPLIFIED APPROACH: Directly fetch retailer data
          console.log("Fetching retailers for user ID:", userId);
          const { data: retailersData, error: retailerError } = await supabase
            .from("retailers")
            .select("*")
            .eq("owner_id", userId);

          // Initialize variables for retailer posts
          let retailerPostsData: RetailerBlogPost[] = [];

          if (retailerError) {
            console.error("Retailer fetch error:", retailerError.message);
          } else if (retailersData && retailersData.length > 0) {
            console.log(
              "Found retailers:",
              retailersData.length,
              retailersData
            );

            // Store all retailers
            setRetailers(retailersData);

            // Also keep the first retailer in the single retailer state for backwards compatibility
            const currentRetailer = retailersData[0];
            setRetailer(currentRetailer);

            // Check and fix slugs for all retailers
            for (const retailer of retailersData) {
              if (!retailer.slug) {
                const slug = slugify(retailer.business_name);
                const { error: updateError } = await supabase
                  .from("retailers")
                  .update({ slug })
                  .eq("id", retailer.id);

                if (updateError) {
                  console.error("Error updating retailer slug:", updateError);
                } else {
                  retailer.slug = slug;
                }
              }
            }

            // Fetch blog posts for all retailers
            for (const retailer of retailersData) {
              const { data: postsData, error: postsError } = await supabase
                .from("retailer_blog_posts")
                .select("*")
                .eq("retailer_id", retailer.id)
                .order("created_at", { ascending: false });

              if (postsError) {
                console.error(
                  `Retailer blog posts fetch error for ${retailer.business_name}:`,
                  postsError.message
                );
              } else if (postsData && postsData.length > 0) {
                console.log(
                  `Found ${postsData.length} posts for retailer ${retailer.business_name}`
                );
                retailerPostsData = [
                  ...retailerPostsData,
                  ...(postsData as RetailerBlogPost[]),
                ];
              }
            }
          }

          // Fetch user's events
          const { data: eventsData, error: eventsError } = await supabase
            .from("events")
            .select("*")
            .eq("created_by", userId)
            .order("start_date", { ascending: false });

          if (eventsError) {
            console.error("Events fetch error:", eventsError.message);
            // Continue even if there's an error
          }

          // Fetch user's credits - Modified query
          const { data: listingCreditsData, error: listingCreditsError } =
            await supabase
              .from("credits")
              .select("amount")
              .eq("user_id", userId)
              .maybeSingle(); // Changed from single() to maybeSingle()

          if (listingCreditsError) {
            console.error(
              "Listing credits fetch error:",
              listingCreditsError.message
            );
          }

          const { data: eventCreditsData, error: eventCreditsError } =
            await supabase
              .from("credits_events")
              .select("amount")
              .eq("user_id", userId)
              .maybeSingle(); // Changed from single() to maybeSingle()

          if (eventCreditsError) {
            console.error(
              "Event credits fetch error:",
              eventCreditsError.message
            );
          }

          // Set credits with proper null checking
          setListingCredits(listingCreditsData?.amount ?? 0);
          setEventCredits(eventCreditsData?.amount ?? 0);

          // Update state with all fetched data
          setBlogPosts(blogData || []);
          setRetailerBlogPosts(retailerPostsData);
          setEvents(eventsData || []);
        } else {
          // Just set loading to false if not logged in - will show login prompt instead of redirecting
          setLoading(false);
          setSessionChecked(true);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          variant: "destructive",
          title: "Error loading profile",
          description:
            "We encountered an error loading your profile information. Please refresh the page and try again.",
        });
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    }

    loadProfile();
  }, [router, form, toast, session, supabase]);

  // Add a document click listener to close tooltip when clicking outside
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      // Close tooltip when clicking outside
      if (openTooltipId !== null) {
        setOpenTooltipId(null);
      }
    }

    // Add the event listener
    document.addEventListener("click", handleDocumentClick);

    // Clean up
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [openTooltipId]);

  // Handle tooltip icon click
  const handleTooltipClick = (event: React.MouseEvent, listingId: string) => {
    // Stop propagation to prevent the document click handler from firing
    event.stopPropagation();

    // Toggle tooltip: close if already open, open if closed
    setOpenTooltipId(openTooltipId === listingId ? null : listingId);
  };

  async function handleLicenseUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingLicense(true);

      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an image file (JPEG/PNG).",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "License image must be under 5MB.",
        });
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `license-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("licenses").getPublicUrl(filePath);

      // Update both license_image and is_seller status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          license_image: publicUrl,
          is_seller: true, // Automatically set as seller when license is uploaded
        })
        .eq("id", profile?.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              license_image: publicUrl,
              is_seller: true,
            }
          : null
      );

      toast({
        title: "License uploaded",
        description:
          "Your license has been uploaded successfully. Your account is now marked as a seller.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload license.",
      });
    } finally {
      setUploadingLicense(false);
    }
  }

  async function onSubmit(data: ProfileForm) {
    try {
      if (!profile?.id) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          phone: data.phone,
          address: data.address,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((prev) =>
        prev ? { ...prev, phone: data.phone, address: data.address } : null
      );
      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Failed to update profile.",
      });
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setBlogPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postId)
      );

      toast({
        title: "Post deleted",
        description: "Your blog post has been deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete post",
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile..." />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Access</CardTitle>
            <CardDescription>
              You need to log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add null check for profile right before returning the main UI
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile data..." />
      </div>
    );
  }

  async function handleListingStatusChange(
    id: string,
    value: string
  ): Promise<void> {
    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;

      const { data, error } = await supabase.rpc("update_listing_status", {
        listing_id: id,
        new_status: value,
        user_id: userData.user.id,
      });

      if (error) throw error;

      setListings((prevListings) =>
        prevListings.map((listing) =>
          listing.id === id ? { ...listing, status: value } : listing
        )
      );

      toast({
        title: "Listing updated",
        description:
          "The status of your listing has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating listing status:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update listing status.",
      });
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast({
          variant: "destructive",
          title: "Unauthorized",
          description: "You must be logged in to delete a listing",
        });
        return;
      }

      // Use the server-side API for deletion
      const response = await fetch("/api/listings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          userId: session.session.user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete listing");
      }

      // Update the UI by removing the deleted listing
      setListings((prevListings) =>
        prevListings.filter((listing) => listing.id !== listingId)
      );

      toast({
        title: "Listing deleted",
        description: "Your listing has been deleted successfully",
      });

      // Close the dialog
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete listing",
      });

      // Close the dialog even on error
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    }
  }

  // Function to open the delete confirmation dialog
  function confirmDeleteListing(listingId: string) {
    setListingToDelete(listingId);
    setDeleteDialogOpen(true);
  }

  async function handleRemoveLicense() {
    try {
      if (!profile?.id) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          license_image: null,
          is_seller: false, // Remove seller status when license is removed
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              license_image: null,
              is_seller: false,
            }
          : null
      );

      toast({
        title: "License removed",
        description:
          "Your license has been removed successfully. Your account is no longer marked as a seller.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description:
          error instanceof Error ? error.message : "Failed to remove license.",
      });
    }
  }

  async function handleDeleteRetailer(retailerId: string) {
    try {
      // Confirm deletion
      if (
        !window.confirm(
          "Are you sure you want to delete this retailer profile? This action cannot be undone."
        )
      ) {
        return;
      }

      const { error } = await supabase
        .from("retailers")
        .delete()
        .eq("id", retailerId);

      if (error) throw error;

      setRetailers((prevRetailers) =>
        prevRetailers.filter((retailer) => retailer.id !== retailerId)
      );
      setRetailerBlogPosts((prevPosts) =>
        prevPosts.filter((post) => post.retailer_id !== retailerId)
      );

      toast({
        title: "Retailer deleted",
        description: "Your retailer profile has been deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete retailer",
      });
    }
  }

  async function handleDeleteRetailerPost(postId: string) {
    try {
      const { error } = await supabase
        .from("retailer_blog_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setRetailerBlogPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postId)
      );

      toast({
        title: "Post deleted",
        description: "Your retailer blog post has been deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete post",
      });
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId)
      );

      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete event",
      });
    }
  }

  async function handleRenewListing(
    listingId: string,
    showToast: boolean = true
  ): Promise<void> {
    try {
      console.log(`Renewing listing: ${listingId}`);

      // Call our simplified API endpoint to update the expiry
      const response = await fetch("/api/listings/update-expiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);

        // Fallback to the RPC function if the API fails
        console.log("Trying fallback RPC method");
        const { error } = await supabase.rpc("relist_listing", {
          listing_id: listingId,
        });

        if (error) {
          console.error("RPC fallback error:", error);
          throw new Error("Failed to renew listing after multiple attempts");
        }
      }

      // Update the UI
      setListings((prevListings) =>
        prevListings.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      );

      // Only show toast if showToast is true
      if (showToast) {
        toast({
          title: "Listing renewed",
          description: "Your listing has been renewed for another 30 days.",
        });
      }
    } catch (error) {
      console.error("Error renewing listing:", error);
      toast({
        variant: "destructive",
        title: "Renewal failed",
        description:
          error instanceof Error ? error.message : "Failed to renew listing.",
      });
    }
  }

  // Update the handleRenewalSuccess function to always extend expiry
  async function handleRenewalSuccess(): Promise<void> {
    try {
      if (!listingToFeature) return;

      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;

      console.log("Starting renewal process for listing:", listingToFeature);

      // Step 1: Always update the expiry date to 30 days first
      console.log("Extending listing expiry to 30 days");
      const expiryResponse = await fetch("/api/listings/update-expiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: listingToFeature,
        }),
      });

      if (!expiryResponse.ok) {
        console.error("Error extending listing expiry");
        const errorData = await expiryResponse.json();
        throw new Error(errorData.error || "Failed to extend listing expiry");
      }

      const expiryData = await expiryResponse.json();
      console.log("Expiry update response:", expiryData);

      // Step 2: Call the feature renewal API
      console.log("Renewing featured status");
      const featureResponse = await fetch("/api/listings/renew-feature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.user.id,
          listingId: listingToFeature,
        }),
      });

      if (!featureResponse.ok) {
        const errorData = await featureResponse.json();
        throw new Error(errorData.error || "Failed to renew feature");
      }

      const featureData = await featureResponse.json();
      console.log("Feature API response:", featureData);

      // Update the UI to reflect the changes
      setListings((prevListings) =>
        prevListings.map((listing) =>
          listing.id === listingToFeature
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
                is_featured: true,
                featured_days_remaining: 15, // Assuming feature period is 15 days
              }
            : listing
        )
      );

      toast({
        title: "Listing featured and renewed",
        description:
          "Your listing has been featured for 15 days and renewed for 30 days.",
      });

      // Reset state
      setListingToFeature(null);
    } catch (error) {
      console.error("Error featuring listing:", error);
      toast({
        variant: "destructive",
        title: "Featuring failed",
        description:
          error instanceof Error ? error.message : "Failed to feature listing.",
      });
    }
  }

  // Add this new function after handleRenewalSuccess
  async function testUpdateExpiry(listingId: string) {
    try {
      console.log(`Testing direct expiry update for listing ${listingId}`);

      // Call debug API
      const response = await fetch("/api/listings/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
        }),
      });

      const data = await response.json();
      console.log("Debug API response:", data);

      // Update UI directly instead of refreshing the whole profile
      setListings((prevListings) =>
        prevListings.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      );

      toast({
        title: "Debug completed",
        description: "Check the console logs for details",
      });
    } catch (error) {
      console.error("Debug test failed:", error);
      toast({
        variant: "destructive",
        title: "Test failed",
        description: "Check the console for details",
      });
    }
  }

  async function handleRemoveFeature(listingId: string): Promise<void> {
    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;

      console.log(
        `[REMOVE-FEATURE] Attempting to remove feature status for listing ${listingId}`
      );

      const response = await fetch(
        `/api/listings/feature?listingId=${listingId}&userId=${userData.user.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[REMOVE-FEATURE] API error:`, errorData);
        throw new Error(errorData.error || "Failed to remove feature");
      }

      console.log(
        `[REMOVE-FEATURE] Feature status successfully removed for listing ${listingId}`
      );

      // Update UI by removing ONLY feature status from this listing
      // but preserving the days_until_expiration
      setListings((prevListings) =>
        prevListings.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                is_featured: false,
                featured_days_remaining: 0,
                // Preserve the days_until_expiration and is_near_expiration
              }
            : listing
        )
      );

      toast({
        title: "Feature removed",
        description:
          "Your listing is no longer featured but its expiration date remains unchanged.",
      });
    } catch (error) {
      console.error("Error removing feature:", error);
      toast({
        variant: "destructive",
        title: "Failed to remove feature",
        description:
          error instanceof Error
            ? error.message
            : "Failed to remove feature from listing.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+356 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main St, Valletta"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Username
                  </p>
                  <p className="text-lg">{profile.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-lg">{profile.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="text-lg">{profile.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Address
                  </p>
                  <p className="text-lg">{profile.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Birthday
                  </p>
                  <p className="text-lg">
                    {profile.birthday || "Not provided"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Status */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Status</CardTitle>
            <CardDescription>
              {profile.is_seller
                ? "Your seller verification status and license information"
                : "Upload a picture of your license to certify your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium">Status:</span>
              <Badge
                variant={profile.is_seller ? "default" : "secondary"}
                className={
                  profile.is_seller
                    ? "bg-green-600 hover:bg-green-600 text-white"
                    : ""
                }
              >
                {profile.is_seller
                  ? "Verified Gun Seller"
                  : "No license verified"}
              </Badge>
            </div>

            <div className="space-y-4">
              {profile.license_image && (
                <div className="relative">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Current License:
                  </p>
                  <div className="relative inline-block">
                    <img
                      src={profile.license_image}
                      alt="License"
                      className="w-64 h-auto rounded-md mb-4"
                    />
                    <button
                      onClick={handleRemoveLicense}
                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-100 transition-all"
                      title="Remove license"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  disabled={uploadingLicense}
                  className="hidden"
                  id="license-upload"
                />
                <label
                  htmlFor="license-upload"
                  className="bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-800 transition-colors flex items-center"
                >
                  {profile.license_image ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingLicense
                    ? "Uploading..."
                    : profile.license_image
                    ? "Replace License"
                    : "Upload License"}
                </label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {profile.is_seller ? (
                  "Upload a new license image if your current one has expired."
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        "You can currently add listings that are <b>not firearms</b> such as assesories. <br/> If you wish to sell <b>Firearms</b> or other license required items, please upload a picture of your license to certify your account.",
                    }}
                  />
                )}
              </p>
            </div>
          </CardContent>
          {!profile.license_image && (
            <div className="m-6 p-4 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Information:</span>
              </div>
              <p className="mb-3">
                Maltaguns ensures that all firearms added to the site are owned
                by licensed individuals. For this reason, we require all sellers
                wishing to sell a firearm to upload a picture of their license
                only once and before they list their first firearm. The picture
                must include only the front page of the Malta police license
                issued to you, clearly displaying your name and address which
                must match those on your pofile. Uploaded images will not be
                shared with anyone and are strictly used for verification
                purposes only. Should you have any questions please email us on
                Info@maltaguns.com.
              </p>
              <div
                className="w-full max-w-md h-72 rounded-md bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/license-sample.jpg')" }}
                aria-label="Sample License"
              ></div>
            </div>
          )}
        </Card>

        {/* Listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>
                Manage your marketplace listings
              </CardDescription>
              <div className="mt-4 flex items-center gap-4">
                <div className="bg-muted px-4 py-2 rounded-md">
                  <span className="text-sm text-muted-foreground">
                    Credits Remaining:
                  </span>
                  <span className="font-semibold ml-1">{listingCredits}</span>
                </div>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowCreditDialog(true)}
                >
                  Add more credits
                </Button>
              </div>
            </div>
            <Link href="/marketplace/create">
              <Button className="bg-black text-white hover:bg-gray-800">
                <Package className="mr-2 h-4 w-4" />
                Create Listing
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    {/* Top section with title and featured status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {listing.type === "firearms" ? (
                          <Image
                            src="/images/pistol-gun-icon.svg"
                            alt="Firearms"
                            width={16}
                            height={16}
                            className="mr-2"
                          />
                        ) : (
                          <Package className="h-4 w-4 mr-2" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {listing.title}
                            </h3>
                            {listing.is_featured && (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-500 text-white hover:bg-red-600 flex items-center">
                                  <Star className="h-3 w-3 mr-1" /> Featured
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setListingToRemoveFeature(listing.id);
                                    setRemoveFeatureDialogOpen(true);
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" /> Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className="text-base px-3 py-1">
                        {formatPrice(listing.price)}
                      </Badge>
                    </div>

                    {/* Middle section: Expiration info */}
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground flex flex-col gap-2">
                        {/* Listing expiration */}
                        <div className="flex items-center gap-2">
                          <Calendar
                            className={`h-4 w-4 ${
                              listing.is_near_expiration ? "text-red-500" : ""
                            }`}
                          />
                          <span
                            className={
                              listing.is_near_expiration
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            Expires in {listing.days_until_expiration} days
                            {listing.is_near_expiration && (
                              <span className="ml-1 text-red-500">
                                (Will be removed when expired)
                              </span>
                            )}
                          </span>

                          {/* Move the extend expiry button here */}
                          {(listing.days_until_expiration ?? 0) < 15 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenewListing(listing.id)}
                              className="bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border-orange-200 ml-2"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Relist for 30 days
                            </Button>
                          )}
                        </div>

                        {/* Featured status expiry */}
                        {listing.is_featured &&
                          (listing.featured_days_remaining ?? 0) > 0 && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex items-center gap-2 ${
                                  (listing.featured_days_remaining ?? 0) > 3
                                    ? "text-green-600"
                                    : "text-red-500"
                                }`}
                              >
                                <Star className="h-4 w-4" />
                                <span>
                                  Featured ending in{" "}
                                  {listing.featured_days_remaining} days
                                </span>
                              </div>
                              {/* Add Renew Feature button if less than or equal to 3 days remaining */}
                              {(listing.featured_days_remaining ?? 0) <= 3 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            // Always set the listing to feature regardless of expiry date
                                            setListingToFeature(listing.id);
                                            setFeatureDialogOpen(true);
                                          }}
                                          className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 border-green-200"
                                        >
                                          <Star className="h-4 w-4 mr-2" />
                                          Renew Featured
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Renew featured status for this listing
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Bottom section: Action buttons and status dropdown */}
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status dropdown */}
                        <select
                          value={listing.status}
                          onChange={(e) =>
                            handleListingStatusChange(
                              listing.id,
                              e.target.value
                            )
                          }
                          className="text-sm border rounded h-9 px-3"
                        >
                          <option value="active">Active</option>
                          <option value="sold">Sold</option>
                          <option value="inactive">Inactive</option>
                        </select>

                        {/* Action buttons */}
                        <Link
                          href={`/marketplace/listing/${slugify(
                            listing.title
                          )}`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>

                        {listing.status === "sold" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        ) : (
                          <Link
                            href={`/marketplace/listing/${slugify(
                              listing.title
                            )}/edit`}
                          >
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDeleteListing(listing.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blog Posts - Only show if user has posts */}
        {blogPosts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>My Blog Posts</CardTitle>
                <CardDescription>Manage your blog posts</CardDescription>
              </div>
              <Link href="/blog/create">
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Write Post
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{post.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(post.created_at), "PPP")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={post.published ? "default" : "secondary"}
                          >
                            {post.published ? "Published" : "Draft"}
                          </Badge>
                          <div className="flex gap-2">
                            <Link href={`/blog/${post.slug}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/blog/${post.slug}/edit`}>
                              <Button variant="outline" size="sm">
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events - Only show if user has events */}
        {events.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>My Events</CardTitle>
                <CardDescription>Manage your published events</CardDescription>
                <div className="mt-4 flex items-center gap-4">
                  <div className="bg-muted px-4 py-2 rounded-md">
                    <span className="text-sm text-muted-foreground">
                      Credits Remaining:
                    </span>
                    <span className="font-semibold ml-1">{eventCredits}</span>
                  </div>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowEventCreditDialog(true)}
                  >
                    Add more credits
                  </Button>
                </div>
              </div>
              <Link href="/events/create">
                <Button className="bg-black text-white hover:bg-gray-800">
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3">
                          {event.poster_url ? (
                            <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={event.poster_url}
                                alt={event.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {event.title}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              <p>{format(new Date(event.start_date), "PPP")}</p>
                              <p>{event.location}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/events/${event.slug || event.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/events/${event.slug || event.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retailer Profiles - Show all retailers */}
        {retailers.length > 0 ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>My Retailer Profiles</CardTitle>
                <CardDescription>
                  Manage your business presence on MaltaGuns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {retailers.map((retailerItem) => (
                  <div key={retailerItem.id} className="border rounded-lg p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {retailerItem.logo_url ? (
                          <img
                            src={retailerItem.logo_url}
                            alt={retailerItem.business_name}
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Store className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {retailerItem.business_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {retailerItem.location || "No location specified"}
                          </p>
                          {!retailerItem.slug && (
                            <p className="text-xs text-red-500">
                              Missing slug - please edit your profile
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/retailers/${
                            retailerItem.slug || retailerItem.id
                          }`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Page
                          </Button>
                        </Link>
                        <Link
                          href={`/retailers/${
                            retailerItem.slug || retailerItem.id
                          }/edit`}
                        >
                          <Button variant="outline" size="sm">
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </Link>
                        <Link
                          href={`/retailers/${
                            retailerItem.slug || retailerItem.id
                          }/blog/create`}
                        >
                          <Button variant="outline" size="sm">
                            <BookOpen className="h-4 w-4 mr-2" />
                            New Blog Post
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRetailer(retailerItem.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Retailer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Retailer Blog Posts - Only show if user has posts */}
            {retailerBlogPosts.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>My Retailer Posts</CardTitle>
                    <CardDescription>
                      Manage your retailer blog posts
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {retailerBlogPosts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{post.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(post.created_at), "PPP")}
                              </p>
                              {/* Show which retailer this post belongs to */}
                              {retailers.length > 1 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {retailers.find(
                                    (r) => r.id === post.retailer_id
                                  )?.business_name || "Unknown retailer"}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  post.published ? "default" : "secondary"
                                }
                              >
                                {post.published ? "Published" : "Draft"}
                              </Badge>
                              <div className="flex gap-2">
                                {/* Find the retailer this post belongs to for URL */}
                                {(() => {
                                  const postRetailer = retailers.find(
                                    (r) => r.id === post.retailer_id
                                  );
                                  const retailerPath = postRetailer
                                    ? `/retailers/${
                                        postRetailer.slug || postRetailer.id
                                      }`
                                    : "/retailers";
                                  return (
                                    <>
                                      <Link
                                        href={`${retailerPath}/blog/${post.slug}`}
                                      >
                                        <Button variant="outline" size="sm">
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </Button>
                                      </Link>
                                      <Link
                                        href={`${retailerPath}/blog/${post.slug}/edit`}
                                      >
                                        <Button variant="outline" size="sm">
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Edit
                                        </Button>
                                      </Link>
                                    </>
                                  );
                                })()}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteRetailerPost(post.id)
                                  }
                                  className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          profile?.is_seller && (
            <Card>
              <CardHeader>
                <CardTitle>Create Retailer Profile</CardTitle>
                <CardDescription>
                  Set up your business profile on MaltaGuns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Maltaguns allows businesses in Malta that provide services to
                  the local community to advertise their services on Maltaguns.
                  This may include gun dealers, gun smiths, airsoft equipement
                  repair, wood stock restoration, engineering services or gun
                  safe importers. If you you wish to advertise your store or
                  services on Maltaguns, kindly send an email to
                  info@maltaguns.com in order to gain access to create your
                  retailer profile.
                </p>
                <Link href="/retailers/create">
                  <Button>
                    <Store className="h-4 w-4 mr-2" />
                    Create Retailer Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Add the delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                listingToDelete && handleDeleteListing(listingToDelete)
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Credit Dialog for renewals */}
      {listingToFeature && (
        <FeatureCreditDialog
          open={featureDialogOpen}
          onOpenChange={setFeatureDialogOpen}
          userId={profile?.id ?? ""}
          listingId={listingToFeature ?? ""}
          onSuccess={handleRenewalSuccess}
        />
      )}

      {/* Remove Feature Confirmation Dialog */}
      <Dialog
        open={removeFeatureDialogOpen}
        onOpenChange={setRemoveFeatureDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Feature Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the featured status from this
              listing? This will not refund your feature credit and your listing
              will no longer appear at the top of search results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveFeatureDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (listingToRemoveFeature) {
                  handleRemoveFeature(listingToRemoveFeature);
                  setRemoveFeatureDialogOpen(false);
                  setListingToRemoveFeature(null);
                }
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Remove Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Dialogs */}
      <CreditDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        userId={profile?.id || ""}
        onSuccess={() => {
          toast({
            title: "Credits purchased",
            description: "Your credits have been added to your account.",
          });
        }}
      />

      <EventCreditDialog
        open={showEventCreditDialog}
        onOpenChange={setShowEventCreditDialog}
        userId={profile?.id || ""}
        onSuccess={() => {
          toast({
            title: "Event credits purchased",
            description: "Your event credits have been added to your account.",
          });
        }}
      />
    </div>
  );
}
