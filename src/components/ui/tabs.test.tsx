import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

afterEach(cleanup);

describe('Tabs', () => {
  it('renders tab list, activates tab on click, updates aria-selected, and shows correct content', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="procedures">
        <TabsList>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="timeframes">Timeframes</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="procedures">Procedures Table Content</TabsContent>
        <TabsContent value="timeframes">Timeframes Table Content</TabsContent>
        <TabsContent value="categories">Categories Table Content</TabsContent>
      </Tabs>
    );

    const proceduresTab = screen.getByRole('tab', { name: 'Procedures' });
    const timeframesTab = screen.getByRole('tab', { name: 'Timeframes' });

    expect(proceduresTab).toHaveAttribute('aria-selected', 'true');
    expect(timeframesTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Procedures Table Content')).toBeInTheDocument();
    expect(screen.queryByText('Timeframes Table Content')).not.toBeInTheDocument();

    await user.click(timeframesTab);

    expect(proceduresTab).toHaveAttribute('aria-selected', 'false');
    expect(timeframesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('Procedures Table Content')).not.toBeInTheDocument();
    expect(screen.getByText('Timeframes Table Content')).toBeInTheDocument();
  });

  it('supports roving focus keyboard navigation via arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="first">
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First Content</TabsContent>
        <TabsContent value="second">Second Content</TabsContent>
      </Tabs>
    );

    const firstTab = screen.getByRole('tab', { name: 'First' });
    const secondTab = screen.getByRole('tab', { name: 'Second' });

    await user.tab();
    expect(firstTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(secondTab).toHaveFocus();
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Second Content')).toBeInTheDocument();
  });
});
