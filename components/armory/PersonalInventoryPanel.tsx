'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  Field,
  Input,
  Table,
  th,
  td,
  Empty,
} from '@/components/armory/ui'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2 } from 'lucide-react'

type PersonalItem = {
  id: string
  item_type: string
  make: string | null
  model: string | null
  calibre: string | null
  serial_number: string | null
  acquisition_date: string | null
  notes: string | null
}

const emptyForm = {
  item_type: 'FIREARM',
  make: '',
  model: '',
  calibre: '',
  serial_number: '',
  acquisition_date: '',
  notes: '',
}

type PersonalInventoryPanelProps = {
  initialItems: PersonalItem[]
}

export function PersonalInventoryPanel({
  initialItems,
}: PersonalInventoryPanelProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<PersonalItem[]>(initialItems)
  const [pending, setPending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/armory/personal-items')
    const data = await res.json()
    if (res.ok) setItems(data.items ?? [])
  }, [])

  function startEdit(item: PersonalItem) {
    setEditingId(item.id)
    setForm({
      item_type: item.item_type,
      make: item.make ?? '',
      model: item.model ?? '',
      calibre: item.calibre ?? '',
      serial_number: item.serial_number ?? '',
      acquisition_date: item.acquisition_date ?? '',
      notes: item.notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const payload = {
      item_type: form.item_type,
      make: form.make || null,
      model: form.model || null,
      calibre: form.calibre || null,
      serial_number: form.serial_number || null,
      acquisition_date: form.acquisition_date || null,
      notes: form.notes || null,
    }
    const url = editingId
      ? `/api/armory/personal-items/${editingId}`
      : '/api/armory/personal-items'
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setPending(false)
    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    toast({
      title: editingId ? 'Item updated' : 'Item added',
      description: 'Your personal collection has been saved.',
    })
    resetForm()
    await loadItems()
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this item from your collection?')) return
    const res = await fetch(`/api/armory/personal-items/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Item removed' })
    await loadItems()
    router.refresh()
  }

  return (
    <>
      <Card
        title={`Personal collection (${items.length})`}
        description="Track your personal firearms and related items."
        actions={
          !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              Add item
            </Button>
          )
        }
      >
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 space-y-4 rounded-lg border p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.item_type}
                  onValueChange={v => setForm(f => ({ ...f, item_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIREARM">Firearm</SelectItem>
                    <SelectItem value="NON_FIREARM">Non-firearm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Acquisition date">
                <Input
                  type="date"
                  value={form.acquisition_date}
                  onChange={e =>
                    setForm(f => ({ ...f, acquisition_date: e.target.value }))
                  }
                />
              </Field>
              <Field label="Make">
                <Input
                  value={form.make}
                  onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                />
              </Field>
              <Field label="Model">
                <Input
                  value={form.model}
                  onChange={e =>
                    setForm(f => ({ ...f, model: e.target.value }))
                  }
                />
              </Field>
              <Field label="Calibre">
                <Input
                  value={form.calibre}
                  onChange={e =>
                    setForm(f => ({ ...f, calibre: e.target.value }))
                  }
                />
              </Field>
              <Field label="Serial number">
                <Input
                  value={form.serial_number}
                  onChange={e =>
                    setForm(f => ({ ...f, serial_number: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : editingId ? 'Update item' : 'Add item'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!items.length ? (
          <Empty>
            No items yet. Add your first firearm or accessory to start tracking
            your collection.
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Type</th>
                <th className={th}>Make / model</th>
                <th className={th}>Calibre</th>
                <th className={th}>Serial</th>
                <th className={th}>Acquired</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className={td}>{item.item_type}</td>
                  <td className={td}>
                    {[item.make, item.model].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className={td}>{item.calibre ?? '—'}</td>
                  <td className={td}>{item.serial_number ?? '—'}</td>
                  <td className={td}>{item.acquisition_date ?? '—'}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
