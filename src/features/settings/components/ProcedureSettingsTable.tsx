import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProcedureSettingsTableProps } from '../types/settings.types';

export function ProcedureSettingsTable({
  procedures,
  role,
  onEdit,
  onActivate,
  onRetire,
  onDelete,
  onMove,
}: ProcedureSettingsTableProps) {
  const readOnly = role !== 'admin';

  return (
    <div>
      <Table aria-label="Procedures list">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Order</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>English Label</TableHead>
            <TableHead>Arabic Label</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Leads</TableHead>
            <TableHead className="text-center">Cases</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {procedures.map((procedure, index) => {
            const referenced =
              procedure.referenced_cases_count > 0 || procedure.referenced_leads_count > 0;

            return (
              <TableRow key={procedure.id}>
                <TableCell className="text-center font-mono">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-5">{procedure.display_order}</span>
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        aria-label={`Move ${procedure.code} up`}
                        disabled={readOnly || index === 0}
                        onClick={() => onMove(index, 'up')}
                      >
                        ▲
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        aria-label={`Move ${procedure.code} down`}
                        disabled={readOnly || index === procedures.length - 1}
                        onClick={() => onMove(index, 'down')}
                      >
                        ▼
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono font-medium">{procedure.code}</TableCell>
                <TableCell>{procedure.name_en}</TableCell>
                <TableCell className="font-arabic" dir="rtl">{procedure.name_ar}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      procedure.status === 'active'
                        ? 'default'
                        : procedure.status === 'retired'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="capitalize"
                  >
                    {procedure.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">{procedure.referenced_leads_count}</TableCell>
                <TableCell className="text-center font-mono">{procedure.referenced_cases_count}</TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={readOnly}
                      title={readOnly ? 'Staff read-only: administrative role required' : undefined}
                      onClick={() => onEdit(procedure)}
                    >
                      Edit
                    </Button>
                    {procedure.status === 'draft' && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={readOnly}
                        title={readOnly ? 'Staff read-only: administrative role required' : undefined}
                        onClick={() => onActivate(procedure)}
                      >
                        Activate
                      </Button>
                    )}
                    {procedure.status === 'active' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={readOnly}
                        title={readOnly ? 'Staff read-only: administrative role required' : undefined}
                        onClick={() => onRetire(procedure)}
                      >
                        Retire
                      </Button>
                    )}
                    {procedure.status === 'draft' && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={readOnly || referenced}
                        title={
                          readOnly
                            ? 'Staff read-only: administrative role required'
                            : referenced
                            ? 'Referenced procedures cannot be deleted; retire after activation.'
                            : undefined
                        }
                        onClick={() => onDelete(procedure)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {procedures.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground" role="status">
          No procedures configured yet.
        </p>
      )}
    </div>
  );
}
