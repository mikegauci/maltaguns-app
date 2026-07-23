'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/marketplace/Search'
import {
  Store,
  X,
  User,
  ChevronDown,
  Users,
  Wrench,
  MapPin,
  Boxes,
} from 'lucide-react'
import { useSupabase } from '../providers/SupabaseProvider'
import { forceLogout } from '@/lib/auth-utils'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Combined hamburger + search icon (Vestiaire-style) */
function MenuSearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="12" y2="6" />
      <line x1="3" y1="12" x2="10" y2="12" />
      <line x1="3" y1="18" x2="12" y2="18" />
      <circle cx="17" cy="11" r="3.5" />
      <line x1="19.5" y1="13.5" x2="22" y2="16" />
    </svg>
  )
}

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { supabase, session } = useSupabase()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [establishmentsOpen, setEstablishmentsOpen] = useState(false)

  const prefetchPublic = (queryKey: string, url: string) => {
    void queryClient.prefetchQuery({
      queryKey: [queryKey],
      queryFn: async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Prefetch failed')
        return res.json()
      },
    })
  }

  // Close establishments submenu / mobile menu when route changes
  useEffect(() => {
    setEstablishmentsOpen(false)
    setMenuOpen(false)
  }, [pathname])

  // Check if current path matches the menu item
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  // More reliable logout that ensures complete session cleanup
  const handleLogout = async () => {
    try {
      // First try the standard logout
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during standard logout:', error)
    } finally {
      // Always perform force logout to ensure clean state
      forceLogout()
    }
  }

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 relative flex items-center justify-between">
          {/* Mobile: combined menu + search control (left) */}
          <button
            type="button"
            className="lg:hidden z-10 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu and search'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MenuSearchIcon className="h-5 w-5" />
            )}
          </button>

          {/* Logo: centered on mobile, left on desktop */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 z-0 flex items-center gap-2 max-w-[min(45vw,11rem)] lg:static lg:translate-x-0 lg:max-w-none lg:z-auto"
          >
            <Image
              src="/maltaguns.png"
              alt="MaltaGuns Logo"
              width={152}
              height={28}
              className="h-8 w-auto max-w-full object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-3">
            {/* Desktop search bar - now before Marketplace */}
            <div className="hidden lg:block w-[400px] w-full">
              <SearchBar disableShortcut={false} />
            </div>

            {/* Establishments Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-1 ${isActive('/establishments') ? 'bg-accent' : ''}`}
                >
                  Establishments <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 p-2 mt-2">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href="/establishments"
                    className="flex items-center"
                    onMouseEnter={() =>
                      prefetchPublic(
                        'public-establishments',
                        '/api/public/establishments'
                      )
                    }
                    onFocus={() =>
                      prefetchPublic(
                        'public-establishments',
                        '/api/public/establishments'
                      )
                    }
                  >
                    <Boxes className="h-4 w-4 mr-2" /> All
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href="/establishments/stores"
                    className="flex items-center"
                  >
                    <Store className="h-4 w-4 mr-2" /> Stores
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href="/establishments/clubs"
                    className="flex items-center"
                  >
                    <Users className="h-4 w-4 mr-2" /> Clubs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href="/establishments/servicing"
                    className="flex items-center"
                  >
                    <Wrench className="h-4 w-4 mr-2" /> Servicing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href="/establishments/ranges"
                    className="flex items-center"
                  >
                    <MapPin className="h-4 w-4 mr-2" /> Ranges
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/marketplace"
              onMouseEnter={() =>
                prefetchPublic('public-marketplace', '/api/public/marketplace')
              }
              onFocus={() =>
                prefetchPublic('public-marketplace', '/api/public/marketplace')
              }
            >
              <Button
                variant="ghost"
                className={isActive('/marketplace') ? 'bg-accent' : ''}
              >
                Marketplace
              </Button>
            </Link>

            <Link
              href="/events"
              onMouseEnter={() =>
                prefetchPublic('public-events', '/api/public/events')
              }
              onFocus={() =>
                prefetchPublic('public-events', '/api/public/events')
              }
            >
              <Button
                variant="ghost"
                className={isActive('/events') ? 'bg-accent' : ''}
              >
                Events
              </Button>
            </Link>
            <Link
              href="/blog"
              onMouseEnter={() =>
                prefetchPublic('public-blog', '/api/public/blog')
              }
              onFocus={() => prefetchPublic('public-blog', '/api/public/blog')}
            >
              <Button
                variant="ghost"
                className={isActive('/blog') ? 'bg-accent' : ''}
              >
                Blog
              </Button>
            </Link>
            <Link href="/help">
              <Button
                variant="ghost"
                className={isActive('/help') ? 'bg-accent' : ''}
              >
                Help
              </Button>
            </Link>
          </nav>

          {/* Right-side controls: notifications (logged in) + desktop profile */}
          <div className="z-10 flex items-center gap-2 min-h-10 min-w-10 justify-end">
            {session?.user && <NotificationsBell />}

            {/* Desktop Profile Dropdown */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`aspect-square rounded-full w-10 flex items-center justify-center bg-background focus:outline-none p-2 ${session?.user ? 'border-green-500 border-2 focus:border-green-500' : 'border'}`}
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 p-2 mt-2" align="end">
                  {session?.user ? (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/profile" prefetch={false}>
                          Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/wishlist">Wishlist</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive"
                        onClick={handleLogout}
                      >
                        Log Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/login">Login</Link>
                      </DropdownMenuItem>
                      <div className="px-2 py-1.5">
                        <span className="text-sm text-muted-foreground">
                          Or
                        </span>
                      </div>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/register">Register</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <nav className="lg:hidden bg-background border-b">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-4">
            <SearchBar
              variant="inline"
              disableShortcut
              onSearchComplete={() => setMenuOpen(false)}
            />

            <Link href="/marketplace">
              <Button
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className={isActive('/marketplace') ? 'bg-accent' : ''}
              >
                Marketplace
              </Button>
            </Link>

            {/* Mobile Establishments Section */}
            <div>
              <Button
                variant="ghost"
                className={`w-full justify-start ${isActive('/establishments') ? 'bg-accent' : ''}`}
                onClick={e => {
                  e.preventDefault()
                  if (pathname === '/establishments' && establishmentsOpen) {
                    router.push('/establishments')
                    setMenuOpen(false)
                    setEstablishmentsOpen(false)
                  } else {
                    setEstablishmentsOpen(!establishmentsOpen)
                  }
                }}
              >
                Establishments
              </Button>
              {establishmentsOpen && (
                <div className="pl-4 flex flex-col gap-2 mt-1">
                  <Link href="/establishments">
                    <Button
                      variant="ghost"
                      onClick={() => setMenuOpen(false)}
                      className="w-full justify-start"
                    >
                      <Boxes className="h-4 w-4 mr-2" /> All
                    </Button>
                  </Link>
                  <Link href="/establishments/stores">
                    <Button
                      variant="ghost"
                      onClick={() => setMenuOpen(false)}
                      className="w-full justify-start"
                    >
                      <Store className="h-4 w-4 mr-2" /> Stores
                    </Button>
                  </Link>
                  <Link href="/establishments/clubs">
                    <Button
                      variant="ghost"
                      onClick={() => setMenuOpen(false)}
                      className="w-full justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" /> Clubs
                    </Button>
                  </Link>
                  <Link href="/establishments/servicing">
                    <Button
                      variant="ghost"
                      onClick={() => setMenuOpen(false)}
                      className="w-full justify-start"
                    >
                      <Wrench className="h-4 w-4 mr-2" /> Servicing
                    </Button>
                  </Link>
                  <Link href="/establishments/ranges">
                    <Button
                      variant="ghost"
                      onClick={() => setMenuOpen(false)}
                      className="w-full justify-start"
                    >
                      <MapPin className="h-4 w-4 mr-2" /> Ranges
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/events">
              <Button
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className={isActive('/events') ? 'bg-accent' : ''}
              >
                Events
              </Button>
            </Link>
            <Link href="/blog">
              <Button
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className={isActive('/blog') ? 'bg-accent' : ''}
              >
                Blog
              </Button>
            </Link>
            <Link href="/help">
              <Button
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className={isActive('/help') ? 'bg-accent' : ''}
              >
                Help
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className={isActive('/contact') ? 'bg-accent' : ''}
              >
                Contact
              </Button>
            </Link>

            {/* Mobile Profile Dropdown */}
            {session?.user ? (
              <>
                <Link href="/profile" prefetch={false}>
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Button>
                </Link>
                <Link href="/wishlist" prefetch={false}>
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                    Wishlist
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogout()
                    setMenuOpen(false)
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button onClick={() => setMenuOpen(false)}>Register</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </>
  )
}
