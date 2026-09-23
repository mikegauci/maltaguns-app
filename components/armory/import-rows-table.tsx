'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS = [
  { value: 'FIREARM', label: 'Firearm' },
  { value: 'REGULATED_COMPONENT', label: 'Component' },
  { value: 'ACCESSORY', label: 'Accessory' },
] as const

export function ImportRowsTable({
  headers,
  rows,
  rowTypes,
}: {
  headers: string[]
  rows: string[][]
  rowTypes: {
    itemType: 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY'
    confidence: 'high' | 'low' | null
  }[]
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(rows.map((_, i) => i))
  )
  const [q, setQ] = useState('')

  const allSelected = selected.size === rows.length
  const noneSelected = selected.size === 0
  const needle = q.trim().toLowerCase()
  const visible = needle
    ? new Set(
        rows
          .map((r, idx) =>
            r.some(c => c.toLowerCase().includes(needle)) ? idx : -1
          )
          .filter(i => i >= 0)
      )
    : null

  function toggle(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter rows…"
          className="h-8 w-48 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={allSelected}
          onClick={() => setSelected(new Set(rows.map((_, i) => i)))}
        >
          Select all
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={noneSelected}
          onClick={() => setSelected(new Set())}
        >
          Select none
        </Button>
        <span className="text-muted-foreground">
          {selected.size} of {rows.length} selected
          {visible && ` · showing ${visible.size} matching "${q}"`}
        </span>
      </div>
      <div className="max-h-[50vh] overflow-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>✓</TableHead>
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              {headers.map((h, i) => (
                <TableHead key={i}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => {
              const rt = rowTypes[idx]
              return (
                <TableRow
                  key={idx}
                  className={cn(
                    !r.some(Boolean) && 'opacity-50',
                    visible && !visible.has(idx) && 'hidden'
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      name="row"
                      value={idx}
                      checked={selected.has(idx)}
                      onChange={() => toggle(idx)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <select
                      name={`type_${idx}`}
                      defaultValue={rt.itemType}
                      className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                    >
                      {TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                          {rt.confidence === 'low' ? ' (?)' : ''}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  {headers.map((_, ci) => (
                    <TableCell key={ci} className="text-xs">
                      {r[ci] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
