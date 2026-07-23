export async function clearImpersonationCookieClient(): Promise<void> {
  try {
    await fetch('/api/admin/impersonate/clear', { method: 'POST' })
  } catch {}
}

export async function forceLogout() {
  await clearImpersonationCookieClient()

  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key.startsWith('supabase.auth.') || key.includes('supabase'))
      ) {
        localStorage.removeItem(key)
      }
    }

    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=')
      if (name && (name.includes('supabase') || name.includes('auth'))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
      }
    })

    window.location.href = '/'
  }
}
