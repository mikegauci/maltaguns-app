'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/components/armory/action-form'
import { Button } from '@/components/ui/button'
import { Textarea, Empty, cx } from '@/components/armory/ui'

export type NoteItem = {
  id: string
  body: string
  createdByLabel: string | null
  createdAt: string
  createdByUserId: string | null
}

function fmtDateTime(s: string): string {
  const d = new Date(
    s.includes('T') || s.includes(' ')
      ? s.replace(' ', 'T') + (s.length === 19 ? 'Z' : '')
      : s
  )
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('en-MT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotesLog({
  notes,
  addNote,
  deleteNote,
}: {
  notes: NoteItem[]
  addNote: (fd: FormData) => Promise<ActionResult>
  deleteNote?: (noteId: string) => Promise<ActionResult>
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <Empty>No notes yet.</Empty>
      ) : (
        <ol className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {notes.map(n => (
            <li key={n.id} className="text-sm rounded border px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {n.createdByLabel ?? 'Unknown'} · {fmtDateTime(n.createdAt)}
                </div>
                {deleteNote && (
                  <button
                    type="button"
                    disabled={pending}
                    className="text-xs text-muted-foreground hover:text-red-600"
                    onClick={() => {
                      if (!window.confirm('Delete this note?')) return
                      start(async () => {
                        const r = await deleteNote(n.id)
                        if (!r.ok) setMsg({ ok: false, text: r.error })
                        else router.refresh()
                      })
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{n.body}</div>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault()
          const form = e.currentTarget
          const fd = new FormData(form)
          setMsg(null)
          start(async () => {
            const r = await addNote(fd)
            if (r.ok) {
              form.reset()
              router.refresh()
            } else setMsg({ ok: false, text: r.error })
          })
        }}
      >
        <Textarea name="body" rows={2} placeholder="Add a note…" required />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? 'Adding…' : 'Add note'}
          </Button>
          {msg && (
            <span
              className={cx(
                'text-xs',
                msg.ok ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
