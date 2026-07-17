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

type SlideMode = 'single' | 'pair' | 'triple' | 'peek'

type HomeCarouselContextValue = {
  mode: SlideMode
  /** Static centered row when count < 4 (no Embla). */
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
  return 'peek'
}

/** Width/basis classes shared by carousel slides and static centered cards. */
const slideSizeClass: Record<SlideMode, string> = {
  single: 'basis-[80%] max-w-sm',
  pair: 'basis-1/2 md:basis-1/3 lg:basis-1/4',
  triple: 'basis-[42%] md:basis-1/3 lg:basis-1/4',
  peek: 'basis-[42%] md:basis-[28%] lg:basis-[22%]',
}

/** Desktop arrows only when the carousel can actually scroll. */
function HomeCarouselControls() {
  const { canScrollPrev, canScrollNext } = useCarousel()
  const canScroll = canScrollPrev || canScrollNext

  if (!canScroll) return null

  return (
    <>
      <CarouselPrevious className="hidden md:flex -left-3 lg:-left-12" />
      <CarouselNext className="hidden md:flex -right-3 lg:-right-12" />
    </>
  )
}

interface HomeCarouselProps {
  children: React.ReactNode
  className?: string
}

/**
 * Homepage listing carousels.
 * Fewer than 4 items: static centered row (all breakpoints).
 * 4+ items: Embla carousel with peek / arrows when scrollable.
 */
export function HomeCarousel({ children, className }: HomeCarouselProps) {
  const count = Children.count(children)
  const mode = getSlideMode(count)
  const layout = count > 0 && count < 4 ? 'static' : 'carousel'

  if (layout === 'static') {
    return (
      <HomeCarouselContext.Provider value={{ mode, layout }}>
        <div
          className={cn(
            'flex flex-wrap justify-center -ml-2 md:-ml-4',
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
        <CarouselContent className="-ml-2 md:-ml-4">{children}</CarouselContent>
        <HomeCarouselControls />
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
