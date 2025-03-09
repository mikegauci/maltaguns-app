'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AutoFeatureHandlerProps {
  listingId?: string;
}

export function AutoFeatureHandler({ listingId }: AutoFeatureHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const processFeature = async () => {
      // Only process once
      if (processed) return;

      // Check if this is a success return from payment
      const success = searchParams.get('success');
      const targetId = listingId || searchParams.get('listingId');

      if (success === 'true' && targetId) {
        try {
          console.log('Auto-featuring after payment success');
          setProcessed(true);

          // Get the current user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          
          if (!user) {
            console.error('No user found for auto-featuring');
            return;
          }
          
          // Check if the listing is already featured (webhook might have done this)
          const now = new Date().toISOString();
          const { data: existingFeature, error: checkError } = await supabase
            .from('featured_listings')
            .select('*')
            .eq('listing_id', targetId)
            .gt('end_date', now)
            .maybeSingle();
            
          if (checkError) {
            console.error('Error checking if listing is already featured:', checkError);
          }
          
          // If it's already featured, just show success message
          if (existingFeature) {
            toast.success('Your listing is now featured!', {
              description: 'It will appear at the top of search results for 30 days.',
            });
            
            // Clean the URL parameters
            const currentPath = window.location.pathname;
            router.replace(currentPath);
            return;
          }

          // Not featured yet, call our auto-feature API
          const response = await fetch('/api/listings/auto-feature', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              listingId: targetId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to auto-feature listing');
          }

          const data = await response.json();
          
          if (data.success) {
            // Show success message
            toast.success(
              data.alreadyFeatured 
                ? 'Your listing was already featured!' 
                : 'Your listing is now featured!',
              {
                description: 'It will appear at the top of search results for 30 days.',
              }
            );
            
            // Clean the URL parameters
            const currentPath = window.location.pathname;
            router.replace(currentPath);
          }
        } catch (error) {
          console.error('Error auto-featuring listing:', error);
          toast.error('Failed to apply feature to your listing', {
            description: error instanceof Error ? error.message : 'An unexpected error occurred',
          });
        }
      }
    };

    processFeature();
  }, [searchParams, processed, router, listingId]);

  // This component doesn't render anything visible
  return null;
} 