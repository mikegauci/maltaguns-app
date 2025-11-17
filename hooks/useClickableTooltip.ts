import { useState, useEffect } from 'react'

/**
 * Custom hook for creating mobile-friendly, clickable tooltips
 * Works on both desktop (click/hover) and mobile (tap)
 *
 * @example
 * ```tsx
 * const { isOpen, toggle, triggerProps, contentProps } = useClickableTooltip()
 *
 * return (
 *   <Tooltip open={isOpen}>
 *     <TooltipTrigger {...triggerProps}>
 *       <button>Click me</button>
 *     </TooltipTrigger>
 *     <TooltipContent {...contentProps}>
 *       Tooltip content here
 *     </TooltipContent>
 *   </Tooltip>
 * )
 * ```
 */
export function useClickableTooltip() {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-tooltip-trigger]') &&
        !target.closest('[role="tooltip"]')
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Use setTimeout to ensure this runs after the current click event
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Props to spread on TooltipTrigger
  const triggerProps = {
    onClick: toggle,
    'data-tooltip-trigger': true,
  }

  // Props to spread on TooltipContent
  const contentProps = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  }

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerProps,
    contentProps,
  }
}
