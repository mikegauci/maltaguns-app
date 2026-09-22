import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import {
  parseWorkbook,
  parsePersonalImport,
} from '@/lib/armory/personal-import'

const BATCH_SIZE = 100

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const fd = await req.formData()
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: 'Choose an .xlsx or .csv file' },
      { status: 400 }
    )
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File is larger than 15 MB' },
      { status: 400 }
    )
  }

  const buf = Buffer.from(await file.arrayBuffer())
  let sheets
  try {
    sheets = await parseWorkbook(buf, file.name)
  } catch (e) {
    return NextResponse.json(
      {
        error: `Could not read the file: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 400 }
    )
  }

  const dataSheets = sheets.filter(s => s.rows.length > 0)
  if (dataSheets.length === 0) {
    return NextResponse.json({ error: 'No data rows found' }, { status: 400 })
  }

  const items = dataSheets.flatMap(sheet => {
    const { mapping, items: sheetItems } = parsePersonalImport(
      sheet.headers,
      sheet.rows
    )
    if (
      !Object.values(mapping).some(
        v => v === 'make' || v === 'model' || v === 'serialNumber'
      )
    ) {
      return []
    }
    return sheetItems
  })

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          'No importable rows found. Your sheet needs at least Make, Model, or Serial number columns.',
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  let imported = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE).map(item => ({
      profile_id: auth.user.id,
      ...item,
    }))
    const { error } = await supabase.from('armory_personal_items').insert(batch)
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          imported,
          failedAt: i + 1,
        },
        { status: 500 }
      )
    }
    imported += batch.length
  }

  const totalRows = dataSheets.reduce((n, s) => n + s.rows.length, 0)
  return NextResponse.json({
    imported,
    skipped: totalRows - items.length,
    sheets: dataSheets.map(s => s.sheetName),
  })
}
