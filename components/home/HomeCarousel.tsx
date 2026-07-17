'use client'

import { Children, createContext, useContext } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

type SlideMode = 'single' | 'pair' | 'triple' | 'quad' | 'peek'

type HomeCarouselContextValue = {
  mode: SlideMode
  /** Static centered row for 1–2 items (no Embla). */
  layout: 'carousel' | 'static'
}

const HomeCarouselContext = createContext<HomeCarouselContextValue>({
  mode: 'pair',
  layout: 'carousel',
})

function getSlideMode(count: number): SlideMode {
  if (count <= 1) return 'single'
  if (count === 2) return 'pair'
  if (count === 3) return 'triple'
  if (count === 4) return 'quad'
  return 'peek'
}

/** Width/basis classes shared by carousel slides and static centered cards. */
const slideSizeClass: Record<SlideMode, string> = {
  single: 'basis-[80%] max-w-sm',
  pair: 'basis-1/2 md:basis-1/3 lg:basis-1/4',
  // Peek on mobile; exact slots on md/lg
  triple: 'basis-[42%] md:basis-1/3 lg:basis-1/4',
  // Peek below lg; exact 4-up on desktop
  quad: 'basis-[42%] md:basis-[28%] lg:basis-1/4',
  // Peek at every breakpoint (5+)
  peek: 'basis-[42%] md:basis-[28%] lg:basis-[22%]',
}

function HomeCarouselTrack({ children }: { children: React.ReactNode }) {
  const { canScrollPrev, canScrollNext } = useCarousel()
  const canScroll = canScrollPrev || canScrollNext

  return (
    <>
      <CarouselContent
        className={cn(
          '-ml-2 md:-ml-4',
          // When the row isn’t full, stretch the track and center slides
          !canScroll && 'w-full justify-center'
        )}
      >
        {children}
      </CarouselContent>
      {canScroll ? (
        <>
          <CarouselPrevious className="hidden md:flex -left-3 lg:-left-12" />
          <CarouselNext className="hidden md:flex -right-3 lg:-right-12" />
        </>
      ) : null}
    </>
  )
}

interface HomeCarouselProps {
  children: React.ReactNode
  className?: string
}

/**
 * Homepage listing carousels.
 * 1–2 items: static centered row.
 * 3+ items: Embla (mobile peek for 3; full 4-up on desktop; peek when 5+).
 */
export function HomeCarousel({ children, className }: HomeCarouselProps) {
  const count = Children.count(children)
  const mode = getSlideMode(count)
  const layout = count > 0 && count <= 2 ? 'static' : 'carousel'

  if (layout === 'static') {
    return (
      <HomeCarouselContext.Provider value={{ mode, layout }}>
        <div
          className={cn(
            'flex flex-nowrap justify-center -ml-2 md:-ml-4',
            className
          )}
        >
          {children}
        </div>
      </HomeCarouselContext.Provider>
    )
  }

  return (
    <HomeCarouselContext.Provider value={{ mode, layout }}>
      <Carousel
        opts={{
          align: 'start',
          containScroll: 'trimSnaps',
          watchDrag: api => api.canScrollPrev() || api.canScrollNext(),
        }}
        className={cn('w-full', className)}
      >
        <HomeCarouselTrack>{children}</HomeCarouselTrack>
      </Carousel>
    </HomeCarouselContext.Provider>
  )
}

interface HomeCarouselItemProps {
  children: React.ReactNode
  className?: string
}

export function HomeCarouselItem({
  children,
  className,
}: HomeCarouselItemProps) {
  const { mode, layout } = useContext(HomeCarouselContext)

  if (layout === 'static') {
    return (
      <div
        className={cn(
          'min-w-0 shrink-0 grow-0 pl-2 md:pl-4',
          slideSizeClass[mode],
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <CarouselItem
      className={cn('pl-2 md:pl-4', slideSizeClass[mode], className)}
    >
      {children}
    </CarouselItem>
  )
}
