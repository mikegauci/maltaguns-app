"use client"

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import { Store, Users, MapPin, Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BlogPost {
  id: string
  title: string
  slug: string
  featured_image: string | null
  created_at: string
  category: string
  author_id: string
  store_id?: string
  club_id?: string
  range_id?: string
  servicing_id?: string
  content?: string
  author?: {
    username: string
  } | null
  store?: { id: string, business_name: string, slug: string }[] | null
  club?: { id: string, business_name: string, slug: string }[] | null
  range?: { id: string, business_name: string, slug: string }[] | null
  servicing?: { id: string, business_name: string, slug: string }[] | null
}

interface BlogPostCardProps {
  post: BlogPost
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  const router = useRouter();
  
  // Create excerpt from content by stripping HTML tags (if content exists)
  const getExcerpt = () => {
    if (!post.content) return '';
    const contentText = post.content.replace(/<[^>]*>/g, '');
    return contentText.length > 150 ? contentText.substring(0, 150) + '...' : contentText;
  };

  // Get author username
  const getAuthorName = () => {
    if (post.author) {
      if (typeof post.author === 'object' && post.author !== null) {
        if ('username' in post.author && post.author.username) {
          return post.author.username;
        }
      }
    }
    return 'Unknown';
  };
  
  // Determine if post is from an establishment and which type
  const getEstablishment = () => {
    // First check if store_id exists directly on post
    if (post.store_id) {
      // Look for matching store data
      if (post.store && post.store.length > 0) {
        return { type: 'store', name: post.store[0].business_name, slug: post.store[0].slug };
      }
      // For store posts without store data, we'll use a cleaner URL
      // The link will go to the store page with the ID, but the display name will be better
      return { type: 'store', name: 'Gun Store', slug: `$slug$${post.store_id}` };
    }
    
    // Continue with other establishment types
    if (post.club_id && post.club && post.club.length > 0) {
      return { type: 'club', name: post.club[0].business_name, slug: post.club[0].slug };
    } else if (post.club_id) {
      return { type: 'club', name: 'Club', slug: `$slug$${post.club_id}` };
    }
    
    if (post.range_id && post.range && post.range.length > 0) {
      return { type: 'range', name: post.range[0].business_name, slug: post.range[0].slug };
    } else if (post.range_id) {
      return { type: 'range', name: 'Range', slug: `$slug$${post.range_id}` };
    }
    
    if (post.servicing_id && post.servicing && post.servicing.length > 0) {
      return { type: 'servicing', name: post.servicing[0].business_name, slug: post.servicing[0].slug };
    } else if (post.servicing_id) {
      return { type: 'servicing', name: 'Servicing', slug: `$slug$${post.servicing_id}` };
    }
    
    // Fallback to just checking the related objects
    if (post.store && post.store.length > 0) {
      return { type: 'store', name: post.store[0].business_name, slug: post.store[0].slug };
    }
    if (post.club && post.club.length > 0) {
      return { type: 'club', name: post.club[0].business_name, slug: post.club[0].slug };
    }
    if (post.range && post.range.length > 0) {
      return { type: 'range', name: post.range[0].business_name, slug: post.range[0].slug };
    }
    if (post.servicing && post.servicing.length > 0) {
      return { type: 'servicing', name: post.servicing[0].business_name, slug: post.servicing[0].slug };
    }
    
    return null;
  };

  const excerpt = getExcerpt();
  const authorName = getAuthorName();
  const establishment = getEstablishment();

  // Utility to handle special slug format
  const getEstablishmentLink = (establishment: { type: string, name: string, slug: string }) => {
    if (establishment.slug.startsWith('$slug$')) {
      // This is an ID, get it from the slug format
      const id = establishment.slug.replace('$slug$', '');

      return `/establishments/${establishment.type}s/${id}`;
    }
    return `/establishments/${establishment.type}s/${establishment.slug}`;
  };

  // Get the establishment icon based on type
  const getEstablishmentIcon = () => {
    if (!establishment) return null;
    
    switch (establishment.type) {
      case 'store':
        return <Store className="h-3 w-3 mr-1" />;
      case 'club':
        return <Users className="h-3 w-3 mr-1" />;
      case 'range':
        return <MapPin className="h-3 w-3 mr-1" />;
      case 'servicing':
        return <Wrench className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  // Handle establishment badge click
  const handleEstablishmentClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(path);
  };

  return (
    <Link href={`/blog/${post.category}/${post.slug}`}>
      <Card className="h-full min-h-[400px] hover:shadow-lg transition-shadow duration-200">
        {post.featured_image && (
          <div className="relative w-full aspect-video">
            <img
              src={post.featured_image}
              alt={post.title}
              className="object-cover w-full h-full rounded-t-lg"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">
              {post.category}
            </Badge>
            
            {establishment && (
              <div 
                onClick={(e) => handleEstablishmentClick(e, getEstablishmentLink(establishment))}
                className="cursor-pointer"
              >
                <Badge variant="outline" className="flex items-center text-xs bg-blue-50 border-blue-200 text-blue-700">
                  {getEstablishmentIcon()}
                  {establishment.name}
                </Badge>
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold line-clamp-2 min-h-[3.5rem]">{post.title}</h2>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Add excerpt with line clamp */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {excerpt || 'No description available.'}
          </p>
          
          {/* Add author and date info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            <span>By {authorName}</span>
            <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 