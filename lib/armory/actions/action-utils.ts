export class ActionError extends Error {}

export type ActionResult =
  { ok: true; message?: string; id?: string } | { ok: false; error: string }

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (v === null || typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

export function num(fd: FormData, key: string): number | null {
  const s = str(fd, key)
  if (s === null) return null
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key)
  return n === null ? null : Math.round(n)
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key)
  return v === 'on' || v === '1' || v === 'true'
}

export function tri(fd: FormData, key: string): boolean | null {
  const s = str(fd, key)
  if (s === '1' || s === 'yes') return true
  if (s === '0' || s === 'no') return false
  return null
}

export async function run(
  fn: () => Promise<ActionResult | void>
): Promise<ActionResult> {
  try {
    const r = await fn()
    return r ?? { ok: true }
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message }
    if (
      e &&
      typeof e === 'object' &&
      'digest' in e &&
      String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')
    )
      throw e
    console.error(e)
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unexpected error',
    }
  }
}
