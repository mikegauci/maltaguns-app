"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, AlertCircle, Pencil, Upload, Package, Sun as Gun, Eye, Store, BookOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";
import Link from "next/link";
import { format } from "date-fns";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
}

interface Listing {
  id: string;
  title: string;
  type: 'firearms' | 'non_firearms';
  category: string;
  price: number;
  status: string;
  created_at: string;
}

interface Retailer {
  id: string;
  business_name: string;
  logo_url: string | null;
  location: string;
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
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
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

        // Fetch user's blog posts
        const { data: blogData, error: blogError } = await supabase
          .from("blog_posts")
          .select("id, title, slug, published, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false });

        if (blogError) {
          console.error("Blog posts fetch error:", blogError.message);
          throw blogError;
        }

        // Fetch user's retailer profile
        const { data: retailerData, error: retailerError } = await supabase
          .from("retailers")
          .select("id, business_name, logo_url, location")
          .eq("owner_id", userId)
          .single();

        if (retailerError && retailerError.code !== 'PGRST116') {
          console.error("Retailer fetch error:", retailerError.message);
          throw retailerError;
        }

        setProfile(profileData);
        setListings(listingsData || []);
        setBlogPosts(blogData || []);
        setRetailer(retailerData);
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

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setBlogPosts(prevPosts => prevPosts.filter(post => post.id !== postId));

      toast({
        title: "Post deleted",
        description: "Your blog post has been deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete post",
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

  async function handleListingStatusChange(id: string, value: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: value })
        .eq("id", id);

      if (error) throw error;

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id ? { ...listing, status: value } : listing
        )
      );

      toast({
        title: "Listing updated",
        description: "The status of your listing has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update listing status.",
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

        {/* Seller Status */}
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

        {/* Retailer Profile - Only show if exists */}
        {retailer && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>My Retailer Profile</CardTitle>
                <CardDescription>Manage your business presence on MaltaGuns</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {retailer.logo_url ? (
                    <img
                      src={retailer.logo_url}
                      alt={retailer.business_name}
                      className="w-16 h-16 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{retailer.business_name}</h3>
                    <p className="text-sm text-muted-foreground">{retailer.location}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/retailers/${retailer.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Page
                    </Button>
                  </Link>
                  <Link href={`/retailers/${retailer.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                            {format(new Date(post.created_at), 'PPP')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={post.published ? "default" : "secondary"}>
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

        {/* Listings - Only show if user has listings */}
        {listings.length > 0 && (
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
                              Created {format(new Date(listing.created_at), 'PPP')}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}