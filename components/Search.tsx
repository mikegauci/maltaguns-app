'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search as SearchIcon, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Define the categories
const categories = {
  all: 'All Categories',
  firearms: {
    airguns: 'Airguns',
    ammunition: 'Ammunition',
    black_powder: 'Black powder',
    carbines: 'Carbines',
    crossbow: 'Crossbow',
    pistols: 'Pistols',
    replica_deactivated: 'Replica or Deactivated',
    revolvers: 'Revolvers',
    rifles: 'Rifles',
    schedule_1: 'Schedule 1 (automatic)',
    shotguns: 'Shotguns',
  },
  non_firearms: {
    airsoft: 'Airsoft',
    reloading: 'Reloading',
    militaria: 'Militaria',
    accessories: 'Accessories',
  },
}

interface SearchBarProps {
  disableShortcut?: boolean
}

export function SearchBar({ disableShortcut = false }: SearchBarProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Function to handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // If search term is empty and a category is selected, redirect to category page
    if (!searchTerm.trim() && category !== 'all') {
      // Parse the category parameter to determine the URL
      if (category === 'firearms') {
        router.push(`/marketplace/firearms`)
      } else if (category === 'non_firearms') {
        router.push(`/marketplace/non-firearms`)
      } else if (category.startsWith('firearms-')) {
        const subcategory = category.replace('firearms-', '').replace(/_/g, '-')
        router.push(`/marketplace/firearms/${subcategory}`)
      } else if (category.startsWith('non_firearms-')) {
        const subcategory = category
          .replace('non_firearms-', '')
          .replace(/_/g, '-')
        router.push(`/marketplace/non-firearms/${subcategory}`)
      }
      setIsOpen(false)
      return
    }

    // If search term is empty and All Categories is selected, redirect to search page
    if (!searchTerm.trim() && category === 'all') {
      router.push(`/marketplace/search`)
      setIsOpen(false)
      return
    }

    // Only proceed with search URL if there's a search term
    if (searchTerm.trim()) {
      // Build the search query
      const params = new URLSearchParams()
      params.append('q', searchTerm.trim())

      if (category !== 'all') {
        params.append('category', category)
      }

      // Navigate to search results page
      router.push(`/marketplace/search?${params.toString()}`)
      setIsOpen(false)
    }
  }

  // Function to clear search term
  const clearSearch = () => {
    setSearchTerm('')
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    // Skip setting up the keyboard shortcut if disabled
    if (disableShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disableShortcut])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={() => setIsOpen(true)}
        >
          <SearchIcon className="h-4 w-4" />
          <span className="md:hidden">Search...</span>
          <span className="hidden md:inline">Search Listings...</span>
          {!disableShortcut && (
            <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] md:w-[400px] p-0" align="start">
        <form onSubmit={handleSearch} className="flex flex-col p-4 gap-4">
          <div className="flex flex-col gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium pl-6">
                  All Categories
                </SelectItem>
                <SelectItem value="firearms" className="font-medium pl-8">
                  Firearms
                </SelectItem>
                {Object.entries(categories.firearms).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={`firearms-${value}`}
                    className="pl-12"
                  >
                    {label}
                  </SelectItem>
                ))}

                <SelectItem value="non_firearms" className="font-medium pl-8">
                  Non-Firearms
                </SelectItem>
                {Object.entries(categories.non_firearms).map(
                  ([value, label]) => (
                    <SelectItem
                      key={value}
                      value={`non_firearms-${value}`}
                      className="pl-12"
                    >
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={searchInputRef}
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pr-8 w-full"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit">
                <SearchIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Search for items by title or description. Use plural forms to find
            singular matches too.
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
