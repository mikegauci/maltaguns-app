export function loginRedirectPath(returnPath: string) {
  return `/login?redirectTo=${encodeURIComponent(returnPath)}`
}
