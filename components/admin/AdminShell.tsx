'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { forceLogout } from '@/lib/auth-utils'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import {
  ADMIN_NAV_GROUPS,
  ADMIN_OVERVIEW,
  SITE_NAV_ITEMS,
  isAdminNavActive,
} from '@/lib/admin-nav'
import { ADMIN_SECURITY_ROUTES } from '@/lib/admin-security'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

interface AdminShellProps {
  children: React.ReactNode
  impersonating?: boolean
}

export function AdminShell({
  children,
  impersonating = false,
}: AdminShellProps) {
  const pathname = usePathname()
  const { supabase, session } = useSupabase()
  const queryClient = useQueryClient()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarInitialized, setSidebarInitialized] = useState(false)

  const stickyTopClass = impersonating ? 'top-10' : 'top-0'
  const sidebarStickyTopClass = impersonating
    ? 'top-[calc(2.5rem+3.5rem)]'
    : 'top-14'

  useEffect(() => {
    scheduleEffectWork(() => {
      setMobileNavOpen(false)
    })
  }, [pathname])

  useEffect(() => {
    scheduleEffectWork(() => {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      setSidebarCollapsed(stored === 'true')
      setSidebarInitialized(true)
    })
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed(current => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during standard logout:', error)
    } finally {
      await forceLogout()
    }
  }

  const sidebarContent = (collapsed: boolean) => (
    <AdminSidebarNav
      pathname={pathname}
      collapsed={collapsed}
      onNavigate={() => setMobileNavOpen(false)}
      prefetchPublic={prefetchPublic}
    />
  )

  const isCenteredSecurityRoute =
    pathname.startsWith(ADMIN_SECURITY_ROUTES.changePassword) ||
    pathname.startsWith(ADMIN_SECURITY_ROUTES.mfaEnroll) ||
    pathname.startsWith(ADMIN_SECURITY_ROUTES.mfaVerify)

  if (isCenteredSecurityRoute) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header
        className={cn('sticky z-40 border-b bg-background', stickyTopClass)}
      >
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="/maltaguns.png"
                alt="MaltaGuns Logo"
                width={120}
                height={24}
                className="h-6 w-auto"
                style={{ width: 'auto', height: '1.5rem' }}
              />
              <span className="hidden text-sm font-semibold sm:inline">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {session?.user && <NotificationsBell />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex aspect-square w-9 items-center justify-center rounded-full bg-background p-2 focus:outline-none',
                    session?.user
                      ? 'border-2 border-green-500 focus:border-green-500'
                      : 'border'
                  )}
                  aria-label="Account menu"
                >
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 w-40 p-2" align="end">
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
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin/security">Security</Link>
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
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/register">Register</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            'hidden shrink-0 border-r bg-background lg:block',
            sidebarInitialized && 'transition-[width] duration-200 ease-in-out',
            sidebarCollapsed ? 'w-16' : 'w-60'
          )}
        >
          <div
            className={cn(
              'sticky flex flex-col',
              sidebarStickyTopClass,
              impersonating
                ? 'h-[calc(100vh-2.5rem-3.5rem)]'
                : 'h-[calc(100vh-3.5rem)]'
            )}
          >
            {sidebarContent(sidebarCollapsed)}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="w-full px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
            {sidebarContent(false)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AdminSidebarNav({
  pathname,
  collapsed,
  onNavigate,
  prefetchPublic,
}: {
  pathname: string
  collapsed: boolean
  onNavigate: () => void
  prefetchPublic: (queryKey: string, url: string) => void
}) {
  const [establishmentsOpen, setEstablishmentsOpen] = useState(
    pathname.startsWith('/establishments')
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className={cn(
            'flex-1 space-y-6 overflow-y-auto',
            collapsed ? 'p-2' : 'p-3'
          )}
        >
          <div>
            <AdminNavLink
              item={ADMIN_OVERVIEW}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </div>

          {ADMIN_NAV_GROUPS.map(group => (
            <div key={group.label} className="space-y-1">
              {collapsed ? (
                <Separator className="my-2" />
              ) : (
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(item => (
                  <AdminNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'mt-auto border-t bg-muted/20',
            collapsed ? 'p-2' : 'p-3'
          )}
        >
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Site
            </p>
          )}
          {collapsed && <Separator className="mb-2" />}
          <div className="space-y-1">
            {SITE_NAV_ITEMS.map(item => {
              if (item.children) {
                if (collapsed) {
                  return (
                    <DropdownMenu key={item.href}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          aria-label={item.title}
                          title={item.title}
                        >
                          <item.icon className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        {item.children.map(child => (
                          <DropdownMenuItem key={child.href} asChild>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              onMouseEnter={() =>
                                prefetchPublic(
                                  'public-establishments',
                                  '/api/public/establishments'
                                )
                              }
                            >
                              <child.icon className="mr-2 h-4 w-4" />
                              {child.title}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                return (
                  <Collapsible
                    key={item.href}
                    open={establishmentsOpen}
                    onOpenChange={setEstablishmentsOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            establishmentsOpen && 'rotate-180'
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pb-1 pl-2">
                      {item.children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          onMouseEnter={() =>
                            prefetchPublic(
                              'public-establishments',
                              '/api/public/establishments'
                            )
                          }
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <child.icon className="h-4 w-4" />
                          {child.title}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              const prefetchKey =
                item.href === '/marketplace'
                  ? 'public-marketplace'
                  : item.href === '/events'
                    ? 'public-events'
                    : item.href === '/blog'
                      ? 'public-blog'
                      : null
              const prefetchUrl =
                item.href === '/marketplace'
                  ? '/api/public/marketplace'
                  : item.href === '/events'
                    ? '/api/public/events'
                    : item.href === '/blog'
                      ? '/api/public/blog'
                      : null

              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  onMouseEnter={() => {
                    if (prefetchKey && prefetchUrl) {
                      prefetchPublic(prefetchKey, prefetchUrl)
                    }
                  }}
                  className={cn(
                    'flex items-center rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    collapsed ? 'justify-center px-2' : 'gap-2 px-3'
                  )}
                  aria-label={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.title}
                </Link>
              )

              if (collapsed) {
                return (
                  <SidebarTooltip
                    key={item.href}
                    label={item.title}
                    collapsed={collapsed}
                  >
                    {link}
                  </SidebarTooltip>
                )
              }

              return link
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function AdminNavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item:
    (typeof ADMIN_NAV_GROUPS)[number]['items'][number] | typeof ADMIN_OVERVIEW
  pathname: string
  collapsed: boolean
  onNavigate: () => void
}) {
  const active = isAdminNavActive(pathname, item.href)
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center rounded-md py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-2 px-3',
        active
          ? 'bg-accent font-medium text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
      aria-label={collapsed ? item.title : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && item.title}
    </Link>
  )

  if (collapsed) {
    return (
      <SidebarTooltip label={item.title} collapsed={collapsed}>
        {link}
      </SidebarTooltip>
    )
  }

  return link
}

function SidebarTooltip({
  label,
  collapsed,
  children,
}: {
  label: string
  collapsed: boolean
  children: React.ReactNode
}) {
  if (!collapsed) {
    return <>{children}</>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
