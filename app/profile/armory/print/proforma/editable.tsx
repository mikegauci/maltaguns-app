'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProformaField } from '@/lib/armory/actions/items'

export function EditableFieldValue({
  itemId,
  field,
  value,
  numeric = false,
}: {
  itemId: string
  field: string
  value: string | null
  numeric?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState<string | null>(null)

  if (value) return <span className="pf2-field-value">{value}</span>

  function commit() {
    const v = draft.trim()
    if (!v) return
    startTransition(async () => {
      const res = await updateProformaField(itemId, field, v)
      if (!res.ok) setErr(res.error)
      else {
        setErr(null)
        router.refresh()
      }
    })
  }

  return (
    <span className="pf2-field-value pf2-editable">
      <input
        type={numeric ? 'number' : 'text'}
        className="pf2-edit-input no-print"
        value={draft}
        placeholder="click to fill in"
        disabled={pending}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      {err && <span className="pf2-edit-err no-print">{err}</span>}
    </span>
  )
}

export function TickCell({
  itemId,
  field,
  code,
  checked,
  multi = false,
  display = '✓',
}: {
  itemId: string
  field: string
  code: string
  checked: boolean
  multi?: boolean
  display?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    const value = multi ? code : checked ? '' : code
    startTransition(async () => {
      const res = await updateProformaField(itemId, field, value)
      if (res.ok) router.refresh()
    })
  }

  return (
    <button
      type="button"
      className="pf2-checkcell-btn"
      onClick={toggle}
      disabled={pending}
      aria-pressed={checked}
      title="Click to tick / untick"
    >
      {checked ? display : ''}
    </button>
  )
}

export function EditableCapacity({
  itemId,
  value,
}: {
  itemId: string
  value: number | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')

  if (value !== null) return <>{value}</>

  function commit() {
    const v = draft.trim()
    if (!v) return
    startTransition(async () => {
      const res = await updateProformaField(itemId, 'capacity', v)
      if (res.ok) router.refresh()
    })
  }

  return (
    <input
      type="number"
      className="pf2-edit-input pf2-edit-input-cell no-print"
      value={draft}
      disabled={pending}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}
