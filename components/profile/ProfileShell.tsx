'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import {
  isArmoryRoute,
  isProfileNavActive,
  isProfilePrintRoute,
  type ProfileNavBadgeKey,
  type ProfileNavBadgeVariant,
  type ProfileNavGroup,
  type ProfileNavItem,
} from '@/lib/profile-nav'
import type { ProfileNavContext } from '@/lib/profile-nav-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ArmoryStatusBanner } from '@/components/profile/ArmoryStatusBanner'
import { PROFILE_NAV_ICONS } from '@/components/profile/profile-nav-icons'

const SIDEBAR_COLLAPSED_KEY = 'profile-sidebar-collapsed'

type ProfileShellProps = {
  children: React.ReactNode
  navContext: ProfileNavContext | null
  impersonating?: boolean
}

export function ProfileShell({
  children,
  navContext,
  impersonating = false,
}: ProfileShellProps) {
  const pathname = usePathname()
  const { session } = useSupabase()
  const sidebarHeightClass = impersonating
    ? 'h-[calc(100vh-64px-40px)]'
    : 'h-[calc(100vh-64px)]'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarInitialized, setSidebarInitialized] = useState(false)

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

  if (isProfilePrintRoute(pathname)) {
    return <>{children}</>
  }

  const showShell = Boolean(navContext) || Boolean(session?.user)

  if (!showShell) {
    return <>{children}</>
  }

  const navGroups = navContext?.navGroups ?? []
  const badges = navContext?.badges ?? {}
  const showArmoryBanner =
    isArmoryRoute(pathname) && navContext?.armoryHasDealer

  const sidebarContent = (collapsed: boolean) => (
    <ProfileSidebarNav
      pathname={pathname}
      collapsed={collapsed}
      navGroups={navGroups}
      badges={badges}
      onNavigate={() => setMobileNavOpen(false)}
    />
  )

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-background">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border bg-card lg:block',
          sidebarInitialized && 'transition-[width] duration-200 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cn('sticky top-0 flex flex-col', sidebarHeightClass)}>
          <div
            className={cn(
              'hidden border-b lg:flex',
              sidebarCollapsed ? 'justify-center p-2' : 'justify-end p-2'
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
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
          </div>
          {sidebarContent(sidebarCollapsed)}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open account navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Account</span>
        </div>

        <div className="w-full space-y-6 px-4 py-6 md:px-6 md:py-8">
          {showArmoryBanner && (
            <ArmoryStatusBanner
              accountStatus={navContext?.armoryAccountStatus}
              licenceNumber={navContext?.armoryLicenceNumber}
              licenceExpiry={navContext?.armoryLicenceExpiry}
              statusNote={navContext?.armoryStatusNote}
            />
          )}

          {children}
        </div>
      </main>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 border-border bg-card p-0">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>Account navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
            {sidebarContent(false)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function ProfileSidebarNav({
  pathname,
  collapsed,
  navGroups,
  badges,
  onNavigate,
}: {
  pathname: string
  collapsed: boolean
  navGroups: ProfileNavGroup[]
  badges: Partial<Record<ProfileNavBadgeKey, number>>
  onNavigate: () => void
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className={cn(
          'flex-1 space-y-6 overflow-y-auto',
          collapsed ? 'p-2' : 'p-3'
        )}
      >
        {navGroups.map(group => (
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
                <ProfileNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
                  badgeVariant={item.badgeVariant}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}

function ProfileNavLink({
  item,
  pathname,
  collapsed,
  badgeCount = 0,
  badgeVariant = 'count',
  onNavigate,
}: {
  item: ProfileNavItem
  pathname: string
  collapsed: boolean
  badgeCount?: number
  badgeVariant?: ProfileNavBadgeVariant
  onNavigate: () => void
}) {
  const active = isProfileNavActive(pathname, item.href)
  const Icon = PROFILE_NAV_ICONS[item.iconKey] ?? PROFILE_NAV_ICONS.user
  const showBadge = badgeCount > 0
  const showDot = showBadge && badgeVariant === 'dot'

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center rounded-sm py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-2 px-3',
        active
          ? 'border border-border bg-chrome-slate/50 font-medium text-foreground'
          : 'text-muted-foreground hover:bg-chrome-slate/30 hover:text-foreground'
      )}
      aria-label={collapsed ? item.title : undefined}
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {collapsed && showDot && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        )}
        {collapsed && showBadge && !showDot && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium leading-none text-primary-foreground">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {showDot && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-destructive"
              aria-hidden
            />
          )}
          {showBadge && !showDot && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </>
      )}
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
