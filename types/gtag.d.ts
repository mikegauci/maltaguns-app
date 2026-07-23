export {}

declare global {
  interface Window {
    gtag?: (..._args: unknown[]) => void
    dataLayer?: unknown[]
  }
}
