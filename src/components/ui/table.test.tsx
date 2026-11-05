import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

afterEach(cleanup);

describe('Table', () => {
  it('renders a full accessible table structure', () => {
    render(
      <Table aria-label="Procedures Table">
        <TableCaption>Clinical Procedures</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>rhino</TableCell>
            <TableCell>Rhinoplasty</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total: 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    expect(screen.getByRole('table', { name: 'Procedures Table' })).toBeInTheDocument();
    expect(screen.getByText('Clinical Procedures')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Rhinoplasty')).toBeInTheDocument();
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
  });

  it('renders wrapper with responsive overflow-x-auto container', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Test</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const wrapper = container.querySelector('[data-slot="table-container"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('overflow-x-auto');
  });
});
