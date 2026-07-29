export type AdminSearchUser = {
  id: string
  username: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  is_disabled: boolean | null
}

export const ADMIN_USER_USERNAME_EMAIL_SEARCH_KEYS = [
  'username',
  'email',
] as const

export const ADMIN_USER_FULL_SEARCH_KEYS = [
  'username',
  'email',
  'first_name',
  'last_name',
] as const

export const ADMIN_USER_SEARCH_PLACEHOLDER = 'Search username/email'

export function formatAdminUserLabel(user: AdminSearchUser): string {
  const name = user.username || user.email || user.id
  const suffix = user.email && user.username ? ` (${user.email})` : ''
  return `${name}${suffix}`
}
