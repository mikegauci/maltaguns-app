import { cn } from '@/lib/utils'

type HomeSectionTone = 'default' | 'muted' | 'surface' | 'olive'

interface HomeSectionShellProps {
  children: React.ReactNode
  tone?: HomeSectionTone
  className?: string
  id?: string
}

const toneClasses: Record<HomeSectionTone, string> = {
  default: 'bg-[var(--home-bg)]',
  muted: 'bg-[var(--home-surface)]',
  surface: 'bg-[var(--home-bg)] border-y border-[var(--home-border)]',
  olive: 'bg-[var(--home-olive)]/30 border-y border-[var(--home-border)]',
}

export function HomeSectionShell({
  children,
  tone = 'default',
  className,
  id,
}: HomeSectionShellProps) {
  return (
    <section
      id={id}
      className={cn(toneClasses[tone], 'py-16 lg:py-24', className)}
    >
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  )
}
