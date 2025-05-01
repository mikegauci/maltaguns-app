"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { verifyLicenseImage } from "@/utils/license-verification";

const phoneRegex = /^(356|)(\d{8})$/;

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must not exceed 50 characters")
      .refine((value) => !value.includes("@") && !value.includes("."), {
        message: "Username cannot contain '@' or '.' characters",
      }),
    email: z.string().email("Invalid email address"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    birthday: z.string().refine(
      (value) => {
        const date = new Date(value);
        const today = new Date();
        const minAgeDate = new Date(today);
        minAgeDate.setFullYear(today.getFullYear() - 18);
        return date <= minAgeDate;
      },
      {
        message: "You must be at least 18 years old",
      }
    ),
    phone: z.string().regex(phoneRegex, "Invalid phone number format"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    interestedInSelling: z.boolean().default(false),
    licenseImage: z.any().optional(),
    isVerified: z.boolean().default(false),
    contactPreference: z.enum(["email", "phone", "both"]).default("both"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) =>
      !data.interestedInSelling ||
      (data.interestedInSelling && data.licenseImage),
    {
      message: "License image is required for sellers",
      path: ["licenseImage"],
    }
  );

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipTriggerRef = React.useRef<HTMLButtonElement>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      confirmPassword: "",
      birthday: "",
      phone: "",
      address: "",
      interestedInSelling: false,
      contactPreference: "both",
      acceptTerms: false,
    },
  });

  // Toggle tooltip open state on click
  const handleTooltipToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltipOpen(!tooltipOpen);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking the trigger element
      if (tooltipTriggerRef.current && tooltipTriggerRef.current.contains(e.target as Node)) {
        return;
      }

      // Don't close if clicking inside the tooltip content
      const tooltipContent = document.querySelector('[role="tooltip"]');
      if (tooltipContent && tooltipContent.contains(e.target as Node)) {
        return;
      }

      setTooltipOpen(false);
    };

    // Only add the listener if the tooltip is open
    if (tooltipOpen) {
      // Use setTimeout to ensure this runs after the current click event
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tooltipOpen]);

  const watchInterestedInSelling = form.watch("interestedInSelling");

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

      // Verify the license image using OCR - this now includes auto-rotation
      const { isVerified, isExpired, expiryDate, text, orientation, rotationAngle, correctedImageUrl } = await verifyLicenseImage(file);
      
      // If the license is expired, don't allow it to be uploaded
      if (isExpired) {
        toast({
          variant: "destructive",
          title: "Expired license",
          description: expiryDate 
            ? `This license expired on ${expiryDate}. Please upload a valid license.` 
            : "This license appears to be expired. Please upload a valid license.",
        });
        setUploadingLicense(false);
        return;
      }
      
      // If the orientation is still problematic after auto-rotation, warn the user
      if (orientation === 'rotated') {
        toast({
          title: "Image may be difficult to read",
          description: "The system had trouble reading your license clearly, but has attempted to correct its orientation automatically.",
          className: "bg-amber-100 text-amber-800 border-amber-200",
        });
        // Continue with upload - don't block it
      }
      
      // Use the corrected image URL if available
      const imageToUpload = correctedImageUrl 
        ? await urlToFile(correctedImageUrl, `rotated-${file.name}`, file.type)
        : file;
      
      const fileExt = file.name.split(".").pop();
      const fileName = `license-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { data, error } = await supabase.storage
        .from("licenses")
        .upload(filePath, imageToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("licenses")
        .getPublicUrl(filePath);

      form.setValue("licenseImage", publicUrlData.publicUrl);
      // Store verification status to use during registration
      form.setValue("isVerified", isVerified);

      if (isVerified) {
        toast({
          title: "License uploaded and verified",
          description: expiryDate 
            ? `Your license has been verified and is valid until ${expiryDate}.` 
            : "Your license has been uploaded and verified successfully.",
          className: "bg-green-600 text-white border-green-600",
        });
      } else {
        toast({
          title: "License uploaded",
          description:
            "Your license has been uploaded but could not be automatically verified. An administrator will review your license manually. You may still proceed to register your account.",
          className: "bg-amber-100 text-amber-800 border-amber-200",
        });
      }
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

  /**
   * Converts a data URL to a File object
   * @param url The data URL to convert
   * @param filename The name for the new file
   * @param mimeType The MIME type of the file
   * @returns A Promise that resolves to a File object
   */
  async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  }

  async function onSubmit(data: RegisterForm) {
    try {
      setIsLoading(true);

      // Sign up the user with email confirmation required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          data: {
            username: data.username,
          },
        },
      });

      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (!userId) throw new Error("User ID not found after signup.");

      // Create the user profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        birthday: data.birthday,
        phone: data.phone,
        address: data.address,
        is_seller: data.interestedInSelling,
        is_verified: data.isVerified,
        license_image: data.interestedInSelling ? data.licenseImage : null,
        contact_preference: data.contactPreference,
      });

      if (profileError) throw profileError;
      
      toast({
        title: "Registration successful!",
        description:
          "Please check your email to verify your account. You will be redirected to the login page after verification.",
      });

      router.push("/login");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join the MaltaGuns community</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("username");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            form.trigger("first_name");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            form.trigger("last_name");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("email");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("password");
                          if (form.getValues("confirmPassword")) {
                            form.trigger("confirmPassword");
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("confirmPassword");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => {
                  // Calculate min and max dates
                  const today = new Date();
                  const maxDate = new Date(today);
                  maxDate.setFullYear(today.getFullYear() - 18);

                  const minDate = new Date(today);
                  minDate.setFullYear(today.getFullYear() - 100);

                  return (
                    <FormItem>
                      <FormLabel>Birthday</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          max={maxDate.toISOString().split("T")[0]}
                          min={minDate.toISOString().split("T")[0]}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            form.trigger("birthday");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+356 1234 5678"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("phone");
                        }}
                      />
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
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("address");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Preference - shown for all users */}
              <FormField
                control={form.control}
                name="contactPreference"
                render={({ field }) => (
                  <FormItem className="border p-4 rounded-md">
                    <FormLabel className="font-medium">
                      Contact Preference
                    </FormLabel>
                    <FormDescription>
                      Choose which contact information will be visible to others
                    </FormDescription>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select your contact preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email only</SelectItem>
                        <SelectItem value="phone">Phone number only</SelectItem>
                        <SelectItem value="both">
                          Both email and phone
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestedInSelling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I&apos;m interested in selling firearms
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Only show license upload when checkbox is checked */}
              {watchInterestedInSelling && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">User Verification</h3>
                    <TooltipProvider>
                      <Tooltip open={tooltipOpen}>
                        <TooltipTrigger asChild onClick={handleTooltipToggle} ref={tooltipTriggerRef}>
                          <span className="cursor-help">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="w-[calc(100vw-32px)] max-w-[320px] sm:max-w-md p-3 sm:p-4 text-xs" 
                          sideOffset={5} 
                          align="center"
                          side="bottom"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p>
                            To ensure compliance with Maltese law and EU regulations, Maltaguns requires users who wish to sell firearms to upload a valid firearms license. Verification documents are used solely to confirm your eligibility to participate in firearm-related transactions on our platform.
                          </p>
                          <p className="mt-2">
                            If you choose to use the platform without selling firearms, you can do so. You may verify your license at a later stage if you eventually decide to list firearms for sale.
                          </p>
                          <p className="mt-2">
                            We are committed to safeguarding your privacy and ensuring the secure handling of your data. Your documents will be strictly reviewed for verification purposes only and will not be shared with any third parties or made accessible to anyone else.
                          </p>
                          <p className="mt-2">
                            All data processing is conducted in full compliance with the General Data Protection Regulation (GDPR) and relevant Maltese legislation.
                          </p>
                          <p className="mt-2">
                            For any questions or concerns regarding data processing or your privacy, please contact us at support@maltaguns.com.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* License Upload */}
                  <FormField
                    control={form.control}
                    name="licenseImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firearms License</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {!field.value && (
                              <Button
                                type="button"
                                variant="default"
                                className="bg-black hover:bg-black/90 text-white w-fit flex items-center gap-2 rounded-xl"
                                onClick={() => document.getElementById('license-upload')?.click()}
                                disabled={uploadingLicense}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Upload License
                              </Button>
                            )}
                            <Input
                              id="license-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleLicenseUpload}
                              disabled={uploadingLicense}
                              className="hidden"
                            />
                            <Input type="hidden" {...field} />
                            {uploadingLicense && (
                              <p className="text-sm text-muted-foreground">
                                Uploading license...
                              </p>
                            )}
                            {field.value && (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                      <polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                    <span className="font-medium">License uploaded successfully</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                      form.setValue("licenseImage", "");
                                      form.trigger("licenseImage");
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                                
                                {/* License Image Preview */}
                                <div className="space-y-2">
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                    <img 
                                      id="license-preview"
                                      src={field.value} 
                                      alt="Uploaded license" 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the{" "}
                        <Link 
                          href="/terms" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                        >
                          Terms and Conditions
                        </Link>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-semibold py-6 rounded-lg"
                disabled={isLoading || uploadingLicense}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
