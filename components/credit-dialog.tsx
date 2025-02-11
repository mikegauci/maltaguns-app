// credit-dialog.tsx
"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with your publishable key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Plan {
  id: string;
  credits: number;
  price: number;
  description: string;
}

const plans: Plan[] = [
  { id: "price_1credit", credits: 1, price: 15, description: "Single listing credit" },
  { id: "price_10credits", credits: 10, price: 50, description: "Best value for regular sellers" },
  { id: "price_20credits", credits: 20, price: 100, description: "Perfect for power sellers" },
];

interface CreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function CreditDialog({ open, onOpenChange, userId, onSuccess }: CreditDialogProps) {
  useEffect(() => { void stripePromise; }, []);

  const handlePurchase = async (priceId: string) => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error response from server: ${errorText}`);
      }

      const data = await res.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (error) console.error("Stripe checkout error:", error);
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Purchase Credits</DialogTitle>
          <DialogDescription>Choose a credit package to start creating listings</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-4 flex flex-col">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {plan.credits} Credit{plan.credits > 1 ? "s" : ""}
                </h3>
                <p className="text-2xl font-bold mb-2">€{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <Button className="mt-4" onClick={() => handlePurchase(plan.id)}>
                Purchase
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
