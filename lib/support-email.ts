export const PUBLIC_SUPPORT_EMAIL = 'support@maltaguns.com'

export function getAdminSupportEmail(): string {
  const configured = process.env.ADMIN_SUPPORT_EMAIL?.trim()
  return configured || PUBLIC_SUPPORT_EMAIL
}
