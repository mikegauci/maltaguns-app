import { SupabaseClient } from '@supabase/supabase-js'
import { BlogPost, Event, Store, Club, Servicing, Range } from '../types'

interface ContentHandlerDependencies {
  supabase: SupabaseClient
  toast: any
  setBlogPosts: (posts: BlogPost[] | ((prev: BlogPost[]) => BlogPost[])) => void
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void
  setStores: (stores: Store[] | ((prev: Store[]) => Store[])) => void
  setClubs: (clubs: Club[] | ((prev: Club[]) => Club[])) => void
  setServicing: (servicing: Servicing[] | ((prev: Servicing[]) => Servicing[])) => void
  setRanges: (ranges: Range[] | ((prev: Range[]) => Range[])) => void
}

export function createContentHandlers(deps: ContentHandlerDependencies) {
  const { supabase, toast, setBlogPosts, setEvents, setStores, setClubs, setServicing, setRanges } = deps

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', postId)
      if (error) throw error

      setBlogPosts(prevPosts => prevPosts.filter(post => post.id !== postId))

      toast({
        title: 'Post deleted',
        description: 'Your blog post has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete post',
      })
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId)
      if (error) throw error

      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId))

      toast({
        title: 'Event deleted',
        description: 'Your event has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete event',
      })
    }
  }

  async function handleDeleteStore(storeId: string) {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)

      if (error) throw error

      setStores(prev => prev.filter(s => s.id !== storeId))
      setClubs(prev => prev.filter(c => c.id !== storeId))
      setServicing(prev => prev.filter(s => s.id !== storeId))
      setRanges(prev => prev.filter(r => r.id !== storeId))

      toast({
        title: 'Establishment deleted',
        description: 'Your establishment profile has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete establishment',
      })
    }
  }

  return {
    handleDeletePost,
    handleDeleteEvent,
    handleDeleteStore,
  }
}

