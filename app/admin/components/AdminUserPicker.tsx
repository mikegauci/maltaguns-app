'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  type AdminSearchUser,
  ADMIN_USER_SEARCH_PLACEHOLDER,
  formatAdminUserLabel,
} from '@/lib/admin-user-types'
import { cn } from '@/lib/utils'

type AdminUserPickerProps = {
  value: string
  onChange: (userId: string) => void
  onUserSelect?: (user: AdminSearchUser) => void
  disabled?: boolean
  placeholder?: string
}

export function AdminUserPicker({
  value,
  onChange,
  onUserSelect,
  disabled = false,
  placeholder = 'Select a user',
}: AdminUserPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminSearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminSearchUser | null>(null)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchUsers = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (trimmed.length === 0) {
      abortRef.current?.abort()
      requestIdRef.current += 1
      setUsers([])
      setError(null)
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('q', trimmed)

      const res = await fetch(`/api/admin/users/search?${params.toString()}`, {
        signal: controller.signal,
      })
      const data = await res.json()

      if (requestId !== requestIdRef.current) return

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers((data.users as AdminSearchUser[]) ?? [])
      setError(null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (requestId !== requestIdRef.current) return
      setUsers([])
      setError(err instanceof Error ? err.message : 'Failed to search users')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void fetchUsers(query)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, query, fetchUsers])

  useEffect(() => {
    if (!value) {
      setSelectedUser(null)
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      setQuery('')
      setUsers([])
      setError(null)
      setLoading(false)
    }
  }, [open])

  const handleSelect = (user: AdminSearchUser) => {
    if (user.is_disabled) return
    onChange(user.id)
    onUserSelect?.(user)
    setSelectedUser(user)
    setOpen(false)
    setQuery('')
  }

  const emptyMessage = (() => {
    if (error) return error
    if (query.trim().length === 0) return 'Type to search…'
    return 'No users found.'
  })()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          {selectedUser ? formatAdminUserLabel(selectedUser) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={ADMIN_USER_SEARCH_PLACEHOLDER}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : users.length === 0 ? (
              <CommandEmpty className={cn(error && 'text-destructive')}>
                {emptyMessage}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {users.map(user => {
                  const label = formatAdminUserLabel(user)
                  const isDisabled = Boolean(user.is_disabled)
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      disabled={isDisabled}
                      onSelect={() => handleSelect(user)}
                      className={cn(isDisabled && 'opacity-50')}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === user.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {label}
                      {isDisabled ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Disabled
                        </span>
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
