import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string | React.ReactNode
  className?: string
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'max-w-4xl flex flex-col text-center items-center mx-auto justify-between mb-6',
        className
      )}
    >
      <h1 className="md:text-4xl text-2xl font-bold mb-2 w-full md:w-[75%]">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  )
}
