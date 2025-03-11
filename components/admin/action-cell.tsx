"use client"

import { useState, useEffect } from "react"
import { Edit, MoreHorizontal, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ActionCellProps {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  customActions?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }[]
}

export function ActionCell({
  onEdit,
  onDelete,
  onView,
  customActions = [],
}: ActionCellProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration issues by only rendering after component is mounted
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Return null during server-side rendering or before mounting
  if (!isMounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        {onView && (
          <DropdownMenuItem onClick={onView}>
            View
          </DropdownMenuItem>
        )}
        
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        
        {customActions.length > 0 && (
          <>
            {(onView || onEdit) && <DropdownMenuSeparator />}
            {customActions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 