'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyCorrections } from '@/lib/armory/actions/items'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function CorrectionBox({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!text.trim()) return
    start(async () => {
      const r = await applyCorrections(itemId, text)
      if (!r.ok) {
        setMsg(r.error)
        return
      }
      setMsg(r.message ?? 'Applied')
      setText('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder='e.g. "set year to 1943; calibre 9x19; serial 4471"'
        rows={3}
        disabled={pending}
      />
      <Button
        type="button"
        size="sm"
        disabled={pending || !text.trim()}
        onClick={submit}
      >
        Apply corrections
      </Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  )
}
