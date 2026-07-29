export async function postNotifyCreated(
  url: string,
  payload: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      console.error('Failed to send created notification:', res.status, body)
      return false
    }
    const body = await res.json().catch(() => null)
    if (body && body.ok === false) return false
    return true
  } catch (error) {
    console.error('Failed to send created notification:', error)
    return false
  }
}
