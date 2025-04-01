"use client";

import { useState } from "react";
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

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

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
    contactPreference: z.enum(["email", "phone", "both"]).default("both"),
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

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthday: "",
      phone: "",
      address: "",
      interestedInSelling: false,
      contactPreference: "both",
    },
  });

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

      const fileExt = file.name.split(".").pop();
      const fileName = `license-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { data, error } = await supabase.storage
        .from("licenses")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("licenses")
        .getPublicUrl(filePath);

      form.setValue("licenseImage", publicUrlData.publicUrl);

      toast({
        title: "License uploaded",
        description: "Your license has been uploaded successfully.",
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

  async function onSubmit(data: RegisterForm) {
    try {
      setIsLoading(true);

      // Sign up the user with email confirmation required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
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
        birthday: data.birthday,
        phone: data.phone,
        address: data.address,
        is_seller: data.interestedInSelling,
        license_image: data.interestedInSelling ? data.licenseImage : null,
        contact_preference: data.contactPreference,
      });

      if (profileError) throw profileError;

      // Send another verification email just in case
      await supabase.auth.resend({
        type: "signup",
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

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
                  <h3 className="font-medium">User Verification</h3>

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
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                  <img 
                                    src={field.value} 
                                    alt="Uploaded license" 
                                    className="w-full h-full object-cover"
                                  />
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
