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
type CarouselDensity = 'default' | 'wide'

type HomeCarouselContextValue = {
  mode: SlideMode
  density: CarouselDensity
  layout: 'carousel' | 'static'
}

const HomeCarouselContext = createContext<HomeCarouselContextValue>({
  mode: 'pair',
  density: 'default',
  layout: 'carousel',
})

function getSlideMode(count: number): SlideMode {
  if (count <= 1) return 'single'
  if (count === 2) return 'pair'
  if (count === 3) return 'triple'
  if (count === 4) return 'quad'
  return 'peek'
}

const slideSizeClass: Record<SlideMode, string> = {
  single: 'basis-[80%] max-w-sm',
  pair: 'basis-1/2 md:basis-1/3 lg:basis-1/4',
  triple: 'basis-[42%] md:basis-1/3 lg:basis-1/4',
  quad: 'basis-[42%] md:basis-[28%] lg:basis-1/4',
  peek: 'basis-[42%] md:basis-[28%] lg:basis-[22%]',
}

const wideSlideSizeClass: Record<SlideMode, string> = {
  single:
    'basis-[88%] sm:basis-[70%] md:basis-[45%] lg:max-w-md lg:basis-[32%]',
  pair: 'basis-[88%] sm:basis-[70%] md:basis-[45%] lg:basis-[32%]',
  triple:
    'basis-[88%] sm:basis-[70%] md:basis-[45%] lg:basis-[32%] xl:basis-[24%]',
  quad: 'basis-[88%] sm:basis-[70%] md:basis-[45%] lg:basis-[32%] xl:basis-[24%]',
  peek: 'basis-[88%] sm:basis-[70%] md:basis-[45%] lg:basis-[32%] xl:basis-[24%]',
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
          <CarouselPrevious className="hidden md:flex -left-2 lg:-left-10 h-8 w-8 rounded-sm border border-[var(--home-border)] bg-[var(--home-slate)] text-[var(--home-ink)] hover:bg-[var(--home-surface)] hover:text-[var(--home-amber)]" />
          <CarouselNext className="hidden md:flex -right-2 lg:-right-10 h-8 w-8 rounded-sm border border-[var(--home-border)] bg-[var(--home-slate)] text-[var(--home-ink)] hover:bg-[var(--home-surface)] hover:text-[var(--home-amber)]" />
        </>
      ) : null}
    </>
  )
}

interface HomeCarouselProps {
  children: React.ReactNode
  className?: string
  density?: CarouselDensity
}

/**
 * Homepage listing carousels.
 * 1–2 items: static centered row.
 * 3+ items: Embla (mobile peek for 3; full 4-up on desktop; peek when 5+).
 */
export function HomeCarousel({
  children,
  className,
  density = 'default',
}: HomeCarouselProps) {
  const count = Children.count(children)
  const mode = getSlideMode(count)
  const layout =
    density === 'wide' || count > 2
      ? 'carousel'
      : count > 0
        ? 'static'
        : 'carousel'

  if (layout === 'static') {
    return (
      <HomeCarouselContext.Provider value={{ mode, density, layout }}>
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
    <HomeCarouselContext.Provider value={{ mode, density, layout }}>
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
  const { mode, density, layout } = useContext(HomeCarouselContext)
  const sizes = density === 'wide' ? wideSlideSizeClass : slideSizeClass

  if (layout === 'static') {
    return (
      <div
        className={cn(
          'min-w-0 shrink-0 grow-0 pl-2 md:pl-4',
          sizes[mode],
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <CarouselItem className={cn('pl-2 md:pl-4', sizes[mode], className)}>
      {children}
    </CarouselItem>
  )
}
