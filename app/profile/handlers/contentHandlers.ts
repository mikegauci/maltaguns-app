import { SupabaseClient } from '@supabase/supabase-js'
import { BlogPost, Event, Store, Club, Servicing, Range } from '../types'

export type EstablishmentTable = 'stores' | 'clubs' | 'servicing' | 'ranges'

interface ContentHandlerDependencies {
  supabase: SupabaseClient
  toast: any
  setBlogPosts: (posts: BlogPost[] | ((prev: BlogPost[]) => BlogPost[])) => void
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void
  setStores: (stores: Store[] | ((prev: Store[]) => Store[])) => void
  setClubs: (clubs: Club[] | ((prev: Club[]) => Club[])) => void
  setServicing: (
    servicing: Servicing[] | ((prev: Servicing[]) => Servicing[])
  ) => void
  setRanges: (ranges: Range[] | ((prev: Range[]) => Range[])) => void
}

export function createContentHandlers(deps: ContentHandlerDependencies) {
  const {
    supabase,
    toast,
    setBlogPosts,
    setEvents,
    setStores,
    setClubs,
    setServicing,
    setRanges,
  } = deps

  async function handleDeletePost(postId: string) {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId)
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
        description:
          error instanceof Error ? error.message : 'Failed to delete post',
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
        description:
          error instanceof Error ? error.message : 'Failed to delete event',
      })
    }
  }

  async function handleDeleteEstablishment(
    establishmentId: string,
    table: EstablishmentTable
  ) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', establishmentId)

      if (error) throw error

      if (table === 'stores') {
        setStores(prev => prev.filter(s => s.id !== establishmentId))
      } else if (table === 'clubs') {
        setClubs(prev => prev.filter(c => c.id !== establishmentId))
      } else if (table === 'servicing') {
        setServicing(prev => prev.filter(s => s.id !== establishmentId))
      } else {
        setRanges(prev => prev.filter(r => r.id !== establishmentId))
      }

      toast({
        title: 'Establishment deleted',
        description: 'Your establishment profile has been deleted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete establishment',
      })
    }
  }

  return {
    handleDeletePost,
    handleDeleteEvent,
    handleDeleteEstablishment,
  }
}
