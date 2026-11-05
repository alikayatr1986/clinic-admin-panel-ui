import * as React from 'react';
import { cn } from '@/lib/utils';
import type {
  TableProps,
  TableHeaderProps,
  TableBodyProps,
  TableFooterProps,
  TableRowProps,
  TableHeadProps,
  TableCellProps,
  TableCaptionProps,
} from '@/types/table.types';

const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, ...props },
  ref
) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
});
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  function TableHeader({ className, ...props }, ref) {
    return (
      <thead
        data-slot="table-header"
        ref={ref}
        className={cn('[&_tr]:border-b border-border', className)}
        {...props}
      />
    );
  }
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, ...props }, ref) {
    return (
      <tbody
        data-slot="table-body"
        ref={ref}
        className={cn('[&_tr:last-child]:border-0', className)}
        {...props}
      />
    );
  }
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  function TableFooter({ className, ...props }, ref) {
    return (
      <tfoot
        data-slot="table-footer"
        ref={ref}
        className={cn('border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
        {...props}
      />
    );
  }
);
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ className, ...props }, ref) {
    return (
      <tr
        data-slot="table-row"
        ref={ref}
        className={cn(
          'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
          className
        )}
        {...props}
      />
    );
  }
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  function TableHead({ className, ...props }, ref) {
    return (
      <th
        data-slot="table-head"
        ref={ref}
        className={cn(
          'h-10 px-3 text-start align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pe-0',
          className
        )}
        {...props}
      />
    );
  }
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...props }, ref) {
    return (
      <td
        data-slot="table-cell"
        ref={ref}
        className={cn('p-3 align-middle [&:has([role=checkbox])]:pe-0', className)}
        {...props}
      />
    );
  }
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  function TableCaption({ className, ...props }, ref) {
    return (
      <caption
        data-slot="table-caption"
        ref={ref}
        className={cn('mt-4 text-sm text-muted-foreground', className)}
        {...props}
      />
    );
  }
);
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
