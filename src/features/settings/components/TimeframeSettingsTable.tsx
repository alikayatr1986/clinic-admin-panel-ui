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
import type { TimeframeSetting, TimeframeSettingsTableProps } from '../types/settings.types';

function formatRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min}+ months [${min}, ∞)`;
  }
  return `${min}–${max} months [${min}, ${max})`;
}

export function TimeframeSettingsTable({
  timeframes,
  role,
  isLoading,
  onEdit,
  onActivate,
  onRetire,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TimeframeSettingsTableProps) {
  const isAdmin = role === 'admin';
  const staffDisabledTitle = !isAdmin ? 'Staff read-only' : undefined;

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground" role="status">
        Loading timeframes…
      </div>
    );
  }

  if (timeframes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No timeframes configured yet.
      </div>
    );
  }

  return (
    <Table aria-label="Timeframes list">
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">Order</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>English Label</TableHead>
          <TableHead>Arabic Label</TableHead>
          <TableHead>Clinical Range</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Cases</TableHead>
          <TableHead className="text-end">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timeframes.map((tf: TimeframeSetting, index: number) => {
          const hasReferences = tf.referenced_cases_count > 0;
          const canDelete = isAdmin && !hasReferences;

          return (
            <TableRow key={tf.id}>
              <TableCell className="text-center font-mono">
                <div className="flex items-center justify-center gap-1">
                  <span className="w-5">{tf.display_order}</span>
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      aria-label={`Move ${tf.code} up`}
                      disabled={!isAdmin || index === 0}
                      title={staffDisabledTitle ?? (index === 0 ? 'Already at top' : 'Move up')}
                      onClick={() => onMoveUp(index)}
                    >
                      ▲
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      aria-label={`Move ${tf.code} down`}
                      disabled={!isAdmin || index === timeframes.length - 1}
                      title={staffDisabledTitle ?? (index === timeframes.length - 1 ? 'Already at bottom' : 'Move down')}
                      onClick={() => onMoveDown(index)}
                    >
                      ▼
                    </Button>
                  </div>
                </div>
              </TableCell>

              <TableCell className="font-mono font-medium">
                {tf.code}
              </TableCell>

              <TableCell>{tf.name_en}</TableCell>

              <TableCell className="font-arabic" dir="rtl">
                {tf.name_ar}
              </TableCell>

              <TableCell className="font-mono text-xs">
                {formatRange(tf.min_months, tf.max_months)}
              </TableCell>

              <TableCell>
                <Badge
                  variant={
                    tf.status === 'active'
                      ? 'default'
                      : tf.status === 'retired'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="capitalize"
                >
                  {tf.status}
                </Badge>
              </TableCell>

              <TableCell className="text-center font-mono">
                {tf.referenced_cases_count}
              </TableCell>

              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isAdmin}
                    title={staffDisabledTitle}
                    onClick={() => onEdit(tf)}
                  >
                    Edit
                  </Button>

                  {tf.status === 'draft' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!isAdmin}
                      title={staffDisabledTitle}
                      onClick={() => onActivate(tf)}
                    >
                      Activate
                    </Button>
                  )}

                  {tf.status === 'active' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isAdmin}
                      title={staffDisabledTitle}
                      onClick={() => onRetire(tf)}
                    >
                      Retire
                    </Button>
                  )}

                  {tf.status !== 'active' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!canDelete}
                      title={
                        !isAdmin
                          ? 'Staff read-only'
                          : hasReferences
                          ? 'Cannot delete referenced timeframe'
                          : 'Delete draft timeframe'
                      }
                      onClick={() => onDelete(tf)}
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
  );
}
