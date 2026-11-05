'use client'

import { useSyncExternalStore } from 'react'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { AppChrome } from '@/components/layout/AppChrome'

// Must match IMPERSONATION_VIEW_COOKIE_NAME in lib/impersonation.ts (that
// module is server-only because it imports next/headers).
const VIEW_COOKIE = 'mg_impersonation_view'

type ImpersonationView = { adminUsername: string; targetUsername: string }

function readCookie(): string | null {
  const prefix = `${VIEW_COOKIE}=`
  const entry = document.cookie
    .split('; ')
    .find(part => part.startsWith(prefix))
  return entry ? entry.slice(prefix.length) : null
}

function parseView(raw: string | null): ImpersonationView | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw))
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as ImpersonationView).adminUsername === 'string' &&
      typeof (value as ImpersonationView).targetUsername === 'string'
    ) {
      return value as ImpersonationView
    }
  } catch {}
  return null
}

// Starting or stopping impersonation does a full page load, so the cookie
// only needs reading once per page.
const subscribe = () => () => {}

// The root layout stays free of cookie reads so public pages can be cached;
// the impersonation banner is decided in the browser instead.
export function ImpersonationChrome({
  children,
}: {
  children: React.ReactNode
}) {
  const raw = useSyncExternalStore(subscribe, readCookie, () => null)
  const view = parseView(raw)

  return (
    <div className={view ? 'pt-10' : undefined}>
      {view && (
        <ImpersonationBanner
          adminUsername={view.adminUsername}
          targetUsername={view.targetUsername}
        />
      )}
      <AppChrome impersonation={Boolean(view)}>{children}</AppChrome>
    </div>
  )
}
