import { fmtDate } from '@/lib/armory/format'
import type { AuditLogRow } from '@/lib/armory/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ArmoryAuditTable({
  rows,
  showDealer = false,
}: {
  rows: AuditLogRow[]
  showDealer?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        No activity yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            {showDealer && <TableHead>Dealer</TableHead>}
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {fmtDate(row.createdAt)}
              </TableCell>
              {showDealer && (
                <TableCell className="text-xs">
                  {row.dealerName ?? '—'}
                </TableCell>
              )}
              <TableCell className="text-xs">{row.userEmail ?? '—'}</TableCell>
              <TableCell className="text-xs font-mono">{row.action}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.entityType ?? ''}
                {row.entityId ? ` ${row.entityId.slice(0, 8)}` : ''}
              </TableCell>
              <TableCell
                className="text-xs text-muted-foreground max-w-md truncate"
                title={row.details ?? ''}
              >
                {row.details ?? ''}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.ip ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
