"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface EventCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function EventCreditDialog({ open, onOpenChange, userId, onSuccess }: EventCreditDialogProps) {
  const router = useRouter();
  
  const handlePurchase = async () => {
    try {
      const res = await fetch("/api/create-event-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error response from server: ${errorText}`);
      }

      const data = await res.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");
      
      // Add success URL parameter to redirect back to the create page with success=true
      const { error } = await stripe.redirectToCheckout({ 
        sessionId: data.sessionId
      });
      
      if (error) console.error("Stripe checkout error:", error);
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  // Prevent closing the dialog when clicking outside or pressing escape
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow the dialog to be closed programmatically through our buttons
    if (newOpen === false) {
      return;
    }
    onOpenChange(newOpen);
  };

  const handleBack = () => {
    router.back();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Purchase Event Credits</DialogTitle>
          <DialogDescription>
            Purchase credits to create events on MaltaGuns
          </DialogDescription>
        </DialogHeader>
        <Card className="p-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">1 Event Credit</h3>
            <p className="text-2xl font-bold mb-2">€25</p>
            <p className="text-sm text-muted-foreground">Create one event on MaltaGuns</p>
          </div>
          <Button className="w-full mt-4" onClick={handlePurchase}>
            Purchase
          </Button>
        </Card>
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="w-full border-black text-black hover:bg-gray-100"
          >
            Go Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}