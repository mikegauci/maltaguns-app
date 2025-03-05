"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  calibre?: string;
  type: 'firearms' | 'non_firearms';
  thumbnail: string;
  created_at: string;
  status: string;
}

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

function getCategoryLabel(category: string, type: 'firearms' | 'non_firearms') {
  const firearmsCategories: Record<string, string> = {
    airguns: "Airguns",
    revolvers: "Revolvers",
    pistols: "Pistols",
    rifles: "Rifles",
    carbines: "Carbines",
    shotguns: "Shotguns",
    black_powder: "Black powder",
    replica_deactivated: "Replica or Deactivated",
    crossbow: "Crossbow",
    schedule_1: "Schedule 1 (automatic)"
  };

  const nonFirearmsCategories: Record<string, string> = {
    airsoft: "Airsoft",
    reloading: "Reloading",
    militaria: "Militaria",
    accessories: "Accessories"
  };

  return type === 'firearms' 
    ? firearmsCategories[category] || category
    : nonFirearmsCategories[category] || category;
}

function getSubcategoryLabel(category: string, subcategory: string) {
  const subcategories: Record<string, Record<string, string>> = {
    "airsoft": {
      "airsoft_guns": "Airsoft Guns",
      "bbs_co2": "BBs & CO2",
      "batteries_electronics": "Batteries & Electronics",
      "clothing": "Clothing",
      "other": "Other"
    },
    "reloading": {
      "presses": "Presses",
      "dies": "Dies",
      "tools": "Tools",
      "tumblers_media": "Tumblers & Media",
      "primers_heads": "Primers & Heads",
      "other": "Other"
    },
    "militaria": {
      "uniforms": "Uniforms",
      "helmets": "Helmets",
      "swords_bayonets_knives": "Swords, Bayonets & Knives",
      "medals_badges": "Medals & Badges",
      "other": "Other"
    },
    "accessories": {
      "cleaning_maintenance": "Cleaning & Maintenance",
      "bipods_stands": "Bipods & Stands",
      "slings_holsters": "Slings & Holsters",
      "scopes_sights_optics": "Scopes, Sights & Optics",
      "magazines": "Magazines",
      "books_manuals": "Books & Manuals",
      "hunting_equipment": "Hunting Equipment",
      "safes_cabinets": "Safes & Cabinets",
      "ammo_boxes": "Ammo Boxes",
      "gun_cases": "Gun Cases",
      "safety_equipment": "Safety Equipment",
      "grips": "Grips",
      "other": "Other"
    }
  };

  return subcategories[category]?.[subcategory] || subcategory;
}

// Function to singularize a word (basic implementation)
function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  } else if (word.endsWith('es')) {
    return word.slice(0, -2);
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [type, setType] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSearchResults() {
      setIsLoading(true);
      
      try {
        // Parse the category parameter
        let typeValue: string | null = null;
        let categoryValue: string | null = null;

        if (categoryParam !== 'all') {
          if (categoryParam === 'firearms' || categoryParam === 'non_firearms') {
            typeValue = categoryParam;
          } else if (categoryParam.startsWith('firearms-')) {
            typeValue = 'firearms';
            categoryValue = categoryParam.replace('firearms-', '');
          } else if (categoryParam.startsWith('non_firearms-')) {
            typeValue = 'non_firearms';
            categoryValue = categoryParam.replace('non_firearms-', '');
          }
        }

        setType(typeValue);
        setCategory(categoryValue);

        // Build the query
        let supabaseQuery = supabase
          .from('listings')
          .select('*')
          .eq('status', 'active');

        // Add type filter if specified
        if (typeValue) {
          supabaseQuery = supabaseQuery.eq('type', typeValue);
        }

        // Add category filter if specified
        if (categoryValue) {
          supabaseQuery = supabaseQuery.eq('category', categoryValue);
        }

        // Only add search conditions if query is not empty
        if (query) {
          // Create search terms including singular/plural forms
          const searchTerms = [query.toLowerCase()];
          const words = query.toLowerCase().split(/\s+/);
          
          // Add singular forms of plural words
          words.forEach(word => {
            const singular = singularize(word);
            if (singular !== word) {
              searchTerms.push(singular);
            }
          });

          // Add search terms for title and description
          const searchConditions = searchTerms.map(term => 
            `title.ilike.%${term}%,description.ilike.%${term}%`
          ).join(',');
          
          supabaseQuery = supabaseQuery.or(searchConditions);
        }

        // Execute the query
        const { data, error } = await supabaseQuery;

        if (error) throw error;
        
        setListings(data || []);
      } catch (error) {
        console.error('Error searching listings:', error);
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSearchResults();
  }, [query, categoryParam]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/marketplace">
                <Button variant="ghost" size="sm" className="h-8">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl mb-4 font-bold">
              {isLoading ? 'Loading...' : 
                query ? 'Search Results' : 
                category ? `${getCategoryLabel(category, type as 'firearms' | 'non_firearms')}` : 
                type ? (type === 'firearms' ? 'Firearms' : 'Non-Firearms') : 
                'All Listings'}
            </h1>
            <p className="text-muted-foreground">
              {isLoading ? 'Searching...' : 
                query ? `Found ${listings.length} result${listings.length !== 1 ? 's' : ''} for "${query}"` :
                `Showing ${listings.length} listing${listings.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-6 text-center">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or category filters.
              </p>
              <Link href="/marketplace">
                <Button>
                  Browse All Listings
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link 
                key={listing.id} 
                href={`/marketplace/listing/${listing.id}/${slugify(listing.title)}`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={listing.thumbnail}
                      alt={listing.title}
                      className="object-cover w-full h-full"
                    />
                    {listing.status === 'sold' && (
                      <Badge variant="destructive" className="absolute top-2 right-2">Sold</Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {listing.type === 'firearms' ? (
                        <Target className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                      <Badge variant="secondary">
                        {getCategoryLabel(listing.category, listing.type)}
                      </Badge>
                      {listing.subcategory && (
                        <Badge variant="outline">
                          {getSubcategoryLabel(listing.category, listing.subcategory)}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">
                        {formatPrice(listing.price)}
                      </p>
                      {listing.type === 'firearms' && listing.calibre && (
                        <Badge variant="secondary">
                          {listing.calibre}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 