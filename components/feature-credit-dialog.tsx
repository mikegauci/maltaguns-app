import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Price amount in EUR
const FEATURE_PRICE = 5;

interface FeatureListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  listingId: string;
  onSuccess?: () => void;
}

export function FeatureCreditDialog({ 
  open, 
  onOpenChange, 
  userId, 
  listingId,
  onSuccess 
}: FeatureListingDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async () => {
    try {
      setLoading(true);
      
      // Redirect to Stripe checkout
      const response = await fetch("/api/checkout/feature-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          listingId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to create checkout session");
      }
      
      const data = await response.json();
      
      if (data.url) {
        router.push(data.url);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process request");
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setSuccess(false);
      }
    }
  };

  const handleBackToListings = () => {
    router.push("/marketplace");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {success ? "Listing Featured!" : "Feature Your Listing"}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "Your listing will now appear at the top of search results for 30 days."
              : `Feature your listing for €${FEATURE_PRICE} to make it stand out and appear at the top of search results for 30 days.`}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="flex flex-col gap-4">
            <div className="text-center p-4 bg-muted rounded-md">
              <p className="font-semibold text-lg">€{FEATURE_PRICE}.00</p>
              <p className="text-sm text-muted-foreground">
                One-time payment for 30 days of featuring
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Your listing will now appear at the top of search results for 30 days.
            </p>
          </div>
        )}

        <DialogFooter>
          {!success ? (
            <Button
              onClick={handlePurchase}
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : `Purchase Feature (€${FEATURE_PRICE})`}
            </Button>
          ) : (
            <Button onClick={handleBackToListings} className="w-full">
              Back to Marketplace
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 