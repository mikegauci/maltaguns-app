"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, AlertCircle, Pencil, Upload, Package, Sun as Gun, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import Link from "next/link";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Listing {
  id: string;
  title: string;
  type: 'firearms' | 'non_firearms';
  category: string;
  price: number;
  status: string;
  created_at: string;
}

const profileSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-MT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
          console.error("Authentication error:", authError?.message || "User not found");
          router.push("/login");
          return;
        }

        const userId = userData.user.id;

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          throw profileError;
        }

        // Fetch user's listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("id, title, type, category, price, status, created_at")
          .eq("seller_id", userId)
          .order("created_at", { ascending: false });

        if (listingsError) {
          console.error("Listings fetch error:", listingsError.message);
          throw listingsError;
        }

        setProfile(profileData);
        setListings(listingsData);
        form.reset({
          phone: profileData.phone || "",
          address: profileData.address || "",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, form]);

  async function handleLicenseUpload(event: React.ChangeEvent<HTMLInputElement>) {
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

      const fileExt = file.name.split('.').pop();
      const fileName = `license-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("licenses")
        .getPublicUrl(filePath);

      // Update both license_image and is_seller status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          license_image: publicUrl,
          is_seller: true // Automatically set as seller when license is uploaded
        })
        .eq("id", profile?.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { 
        ...prev, 
        license_image: publicUrl,
        is_seller: true
      } : null);

      toast({
        title: "License uploaded",
        description: "Your license has been uploaded successfully. Your account is now marked as a seller.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload license.",
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

      setProfile(prev => prev ? { ...prev, phone: data.phone, address: data.address } : null);
      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile.",
      });
    }
  }

  async function handleListingStatusChange(listingId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", listingId);

      if (error) throw error;

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? { ...listing, status: newStatus }
            : listing
        )
      );

      toast({
        title: "Status updated",
        description: `Listing status has been updated to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update listing status.",
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal information and account details</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <Input placeholder="123 Main St, Valletta" {...field} />
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
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-lg">{profile.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg">{profile.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-lg">{profile.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-lg">{profile.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Birthday</p>
                  <p className="text-lg">{profile.birthday || "Not provided"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Status</CardTitle>
            <CardDescription>
              {profile.is_seller 
                ? "Your seller verification status and license information" 
                : "Upload a license to become a seller"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium">Status:</span>
              <Badge variant={profile.is_seller ? "default" : "secondary"}>
                {profile.is_seller ? "Seller" : "Not a Seller"}
              </Badge>
            </div>

            <div className="space-y-4">
              {profile.license_image && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Current License:</p>
                  <img src={profile.license_image} alt="License" className="w-64 h-auto rounded-md mb-4" />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {profile.is_seller ? "Update License:" : "Upload License to Become a Seller:"}
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLicenseUpload}
                  disabled={uploadingLicense}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {profile.is_seller 
                    ? "Upload a new license image if your current one has expired."
                    : "Upload your firearms license to start selling on MaltaGuns."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Management Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>Manage your marketplace listings</CardDescription>
            </div>
            <Link href="/marketplace/create">
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">You haven`&#39;`t created any listings yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <Card key={listing.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {listing.type === 'firearms' ? (
                            <Gun className="h-4 w-4" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                          <div>
                            <h3 className="font-semibold">{listing.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Created {formatDate(listing.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge>{formatPrice(listing.price)}</Badge>
                          <select
                            value={listing.status}
                            onChange={(e) => handleListingStatusChange(listing.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="active">Active</option>
                            <option value="sold">Sold</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <div className="flex gap-2">
                            <Link href={`/marketplace/listing/${listing.id}/${slugify(listing.title)}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/marketplace/listing/${listing.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}