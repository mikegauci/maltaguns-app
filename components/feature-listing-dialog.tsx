"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

interface FeatureListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
}

export function FeatureListingDialog({
  open,
  onOpenChange,
  listingId,
}: FeatureListingDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Create a Stripe Checkout Session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-feature-checkout',
          listingId,
          userId: user.id,
          successUrl: `${window.location.origin}/marketplace/listing/${listingId}?featured=success`,
          cancelUrl: `${window.location.origin}/marketplace/listing/${listingId}?featured=cancelled`,
        }),
      });

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Feature Your Listing</DialogTitle>
          <DialogDescription>
            Boost your listing's visibility and attract more potential buyers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
            <h3 className="text-xl font-semibold">Featured Listing</h3>
            <p className="text-3xl font-bold">€5</p>
            <ul className="text-sm text-muted-foreground space-y-2 text-center">
              <li>• Premium placement in search results</li>
              <li>• Highlighted listing card</li>
              <li>• Featured section on homepage</li>
              <li>• 7 days of featured status</li>
            </ul>
            <Button 
              className="w-full mt-4" 
              onClick={handlePurchase}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Purchase Now"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 