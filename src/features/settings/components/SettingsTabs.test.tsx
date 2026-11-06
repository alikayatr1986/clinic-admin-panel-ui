import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsTabs } from './SettingsTabs';
import type { SettingsTabKey } from '../types/settings.types';

afterEach(cleanup);

describe('SettingsTabs', () => {
  it('renders tab triggers and indicates active tab', () => {
    render(<SettingsTabs activeTab="timeframes" onTabChange={vi.fn()} />);

    const timeframesTab = screen.getByRole('tab', { name: 'Timeframes' });
    const proceduresTab = screen.getByRole('tab', { name: 'Procedures' });
    const categoriesTab = screen.getByRole('tab', { name: 'Blog Categories' });

    expect(timeframesTab).toBeInTheDocument();
    expect(proceduresTab).toBeInTheDocument();
    expect(categoriesTab).toBeInTheDocument();

    expect(timeframesTab).toHaveAttribute('aria-selected', 'true');
    expect(proceduresTab).toHaveAttribute('aria-selected', 'false');
    expect(categoriesTab).toHaveAttribute('aria-selected', 'false');

    expect(timeframesTab).toHaveAttribute('aria-controls', 'timeframes-panel');
    expect(proceduresTab).toHaveAttribute('aria-controls', 'procedures-panel');
    expect(categoriesTab).toHaveAttribute('aria-controls', 'categories-panel');
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<SettingsTabs activeTab="timeframes" onTabChange={onTabChange} />);

    await user.click(screen.getByRole('tab', { name: 'Procedures' }));
    expect(onTabChange).toHaveBeenCalledWith('procedures' as SettingsTabKey);

    await user.click(screen.getByRole('tab', { name: 'Blog Categories' }));
    expect(onTabChange).toHaveBeenCalledWith('categories' as SettingsTabKey);
  });

  it('supports roving keyboard arrow navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<SettingsTabs activeTab="timeframes" onTabChange={vi.fn()} />);

    const timeframesTab = screen.getByRole('tab', { name: 'Timeframes' });
    timeframesTab.focus();
    expect(timeframesTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Procedures' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Blog Categories' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Verification' })).toHaveFocus();
  });
});
