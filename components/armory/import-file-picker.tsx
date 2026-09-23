'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImportFilePicker({
  name,
  accept,
  required,
  disabled,
}: {
  name: string
  accept: string
  required?: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function pick() {
    if (!disabled) inputRef.current?.click()
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || !inputRef.current) return
    const dt = new DataTransfer()
    dt.items.add(file)
    inputRef.current.files = dt.files
    setFileName(file.name)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={pick}
        onDragOver={e => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          if (!disabled) onFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-sm border border-dashed px-4 py-8 text-center transition-colors',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && dragOver && 'border-primary bg-primary/5',
          !disabled &&
            !dragOver &&
            'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30'
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted/50 text-muted-foreground">
          {fileName ? (
            <FileSpreadsheet className="h-5 w-5" aria-hidden />
          ) : (
            <Upload className="h-5 w-5" aria-hidden />
          )}
        </span>
        {fileName ? (
          <>
            <span className="text-sm font-medium text-foreground">
              {fileName}
            </span>
            <span className="text-xs text-muted-foreground">
              Click or drop to replace
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">
              Drop your spreadsheet here
            </span>
            <span className="text-xs text-muted-foreground">
              or click to browse · .xlsx, .xls, .csv · up to 15 MB
            </span>
          </>
        )}
      </button>
    </div>
  )
}
