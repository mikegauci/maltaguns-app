'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search'
import {
  Store,
  BookOpen,
  Menu,
  X,
  User,
  ChevronDown,
  Users,
  Wrench,
  MapPin,
  Boxes,
  Heart,
} from 'lucide-react'
import { useSupabase } from './providers/supabase-provider'
import { forceLogout } from '@/lib/auth-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { supabase, session } = useSupabase()
  const [menuOpen, setMenuOpen] = useState(false)
  const [establishmentsOpen, setEstablishmentsOpen] = useState(false)

  // Close establishments submenu when route changes
  useEffect(() => {
    setEstablishmentsOpen(false)
  }, [pathname])

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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/maltaguns.png"
              alt="MaltaGuns Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Mobile search bar - visible only on mobile */}
          <div className="flex-1 mx-4 md:hidden">
            <SearchBar disableShortcut={true} />
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <nav className="hidden md:flex items-center gap-4">
            {/* Desktop search bar - now before Marketplace */}
            <div className="hidden md:block w-[400px] w-full">
              <SearchBar disableShortcut={false} />
            </div>

            {/* Establishments Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1">
                  Establishments <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 p-2 mt-2">
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href="/establishments"
                    className="w-full flex items-center"
                  >
                    <Boxes className="h-4 w-4 mr-2" /> All
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href="/establishments/stores"
                    className="w-full flex items-center"
                  >
                    <Store className="h-4 w-4 mr-2" /> Stores
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href="/establishments/clubs"
                    className="w-full flex items-center"
                  >
                    <Users className="h-4 w-4 mr-2" /> Clubs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href="/establishments/servicing"
                    className="w-full flex items-center"
                  >
                    <Wrench className="h-4 w-4 mr-2" /> Servicing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href="/establishments/ranges"
                    className="w-full flex items-center"
                  >
                    <MapPin className="h-4 w-4 mr-2" /> Ranges
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>

            <Link href="/events">
              <Button variant="ghost">Events</Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost">Blog</Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost">Help</Button>
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`aspect-square rounded-full w-10 flex items-center justify-center bg-background focus:outline-none p-2 ${session?.user ? 'border-green-500 border-2 focus:border-green-500' : 'border'}`}
                >
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40 p-2 mt-2">
                {session?.user ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/profile" className="w-full">
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/wishlist" className="w-full">
                        Wishlist
                      </Link>
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
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/login" className="w-full">
                        Login
                      </Link>
                    </DropdownMenuItem>
                    <div className="px-2 py-1.5">
                      <span className="text-sm text-muted-foreground">Or</span>
                    </div>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/register" className="w-full">
                        Register
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      {menuOpen && (
        <nav className="md:hidden bg-background border-b">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-4">
            <Link href="/marketplace">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Marketplace
              </Button>
            </Link>

            {/* Mobile Establishments Section */}
            <div>
              <Button
                variant="ghost"
                className="w-full justify-start"
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
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Events
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Blog
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Help
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Contact
              </Button>
            </Link>

            {/* Mobile Profile Dropdown */}
            {session?.user ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                    Profile
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
