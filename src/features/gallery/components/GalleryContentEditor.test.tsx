import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { galleryApi } from '../services/gallery.service';
import type { GalleryContent } from '../types/gallery.types';
import { GalleryContentEditor } from './GalleryContentEditor';

function renderEditor(props?: {
  username?: string;
  onExpired?: () => void;
  onBack?: () => void;
  registerBlocker?: (blocker: (() => boolean) | null) => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GalleryContentEditor
        username={props?.username ?? 'test-user'}
        onExpired={props?.onExpired ?? vi.fn()}
        onBack={props?.onBack ?? vi.fn()}
        registerBlocker={props?.registerBlocker ?? vi.fn()}
      />
    </QueryClientProvider>
  );
}

const enContent: GalleryContent = {
  type: 'gallery',
  lang: 'en',
  eyebrow: 'Clinical Results',
  heading: 'Before & After Gallery',
  introduction: 'Explore our documented procedures and patient outcomes.',
  statistics: [
    { key: 'cases', value: '500+', label: 'Procedures Performed' },
  ],
  revision: 3,
  published: true,
  approval: 'approved',
};

const arContent: GalleryContent = {
  type: 'gallery',
  lang: 'ar',
  eyebrow: 'نتائج سريرية',
  heading: 'معرض قبل وبعد',
  introduction: 'استكشف إجراءاتنا ونتائج مرضانا الموثقة.',
  statistics: [
    { key: 'cases', value: '+٥٠٠', label: 'إجراء منجز' },
  ],
  revision: 2,
  published: true,
  approval: 'approved',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('GalleryContentEditor', () => {
  it('switches between English and Arabic tabs while preserving unsaved draft edits in memory', async () => {
    vi.spyOn(galleryApi, 'content').mockImplementation(async (lang) => {
      return { data: lang === 'ar' ? [arContent] : [enContent] };
    });

    const user = userEvent.setup();
    renderEditor();

    // Verify initial English content
    const eyebrowEn = await screen.findByLabelText(/eyebrow/i);
    expect(eyebrowEn).toHaveValue('Clinical Results');

    // Make dirty edit in English
    await user.clear(eyebrowEn);
    await user.type(eyebrowEn, 'Updated English Eyebrow');
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();

    // Switch to Arabic tab
    await user.click(screen.getByRole('tab', { name: 'Arabic' }));

    // Arabic panel mounts
    const eyebrowAr = await screen.findByLabelText(/eyebrow/i);
    expect(eyebrowAr).toHaveValue('نتائج سريرية');
    expect(eyebrowAr).toHaveAttribute('dir', 'rtl');

    // Edit Arabic content
    await user.clear(eyebrowAr);
    await user.type(eyebrowAr, 'عنوان عربي معدل');

    // Switch back to English tab
    await user.click(screen.getByRole('tab', { name: 'English' }));

    // Verify English dirty edits are preserved in memory!
    const restoredEyebrowEn = await screen.findByLabelText(/eyebrow/i);
    expect(restoredEyebrowEn).toHaveValue('Updated English Eyebrow');

    // Switch to Arabic again and verify Arabic edits are preserved too!
    await user.click(screen.getByRole('tab', { name: 'Arabic' }));
    const restoredEyebrowAr = await screen.findByLabelText(/eyebrow/i);
    expect(restoredEyebrowAr).toHaveValue('عنوان عربي معدل');
  });

  it('validates required fields and statistics limits', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    const user = userEvent.setup();
    renderEditor();

    const eyebrow = await screen.findByLabelText(/eyebrow/i);
    await user.clear(eyebrow);

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields.');
  });

  it('allows adding and removing statistics up to 3', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    const user = userEvent.setup();
    renderEditor();

    await screen.findByText('Statistic 1');

    const addBtn = screen.getByRole('button', { name: 'Add statistic' });
    await user.click(addBtn);
    expect(screen.getByText('Statistic 2')).toBeInTheDocument();

    await user.click(addBtn);
    expect(screen.getByText('Statistic 3')).toBeInTheDocument();

    // Now disabled since maximum 3 statistics
    expect(addBtn).toBeDisabled();

    // Remove statistic 2
    await user.click(screen.getByRole('button', { name: 'Remove statistic 2' }));
    expect(screen.queryByText('Statistic 3')).not.toBeInTheDocument();
    expect(screen.getByText('Statistic 2')).toBeInTheDocument();
    expect(addBtn).not.toBeDisabled();
  });

  it('handles 409 conflict and offers reload or reapply options', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    const update = vi.spyOn(galleryApi, 'updateContent').mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'Concurrent update')
    );
    const user = userEvent.setup();
    renderEditor();

    const eyebrow = await screen.findByLabelText(/eyebrow/i);
    await user.type(eyebrow, ' More');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(update).toHaveBeenCalled();

    expect(
      await screen.findByText(/This content changed elsewhere/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload server content' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reapply my edits' })).toBeVisible();

    // Click Reapply my edits
    await user.click(screen.getByRole('button', { name: 'Reapply my edits' }));
    expect(
      await screen.findByText(/Edits retained. Saving or publishing will overwrite/)
    ).toBeInTheDocument();
  });

  it('stores drafts to sessionStorage on 401 expiry, calls onExpired, and restores drafts on mount', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    const update = vi.spyOn(galleryApi, 'updateContent').mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Session expired')
    );
    const onExpired = vi.fn();
    const user = userEvent.setup();

    renderEditor({ username: 'dr-naserzadeh', onExpired });

    const eyebrow = await screen.findByLabelText(/eyebrow/i);
    await user.type(eyebrow, ' Expiring Edit');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(update).toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalled();

    const saved = sessionStorage.getItem('gallery-content-recovery:dr-naserzadeh');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.forms.en.eyebrow).toBe('Clinical Results Expiring Edit');

    cleanup();

    renderEditor({ username: 'dr-naserzadeh' });
    const restoredEyebrow = await screen.findByLabelText(/eyebrow/i);
    expect(restoredEyebrow).toHaveValue('Clinical Results Expiring Edit');
    expect(screen.getByText('Your edits were restored after session expiry.')).toBeInTheDocument();
  });

  it('registers a confirmation blocker when either locale is dirty', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    let currentBlocker: (() => boolean) | null = null;
    const registerBlocker = vi.fn((blocker) => {
      currentBlocker = blocker;
    });
    const user = userEvent.setup();

    renderEditor({ registerBlocker });

    const eyebrow = await screen.findByLabelText(/eyebrow/i);
    expect(currentBlocker).toBeNull();

    await user.type(eyebrow, ' Dirty');
    expect(currentBlocker).toBeTypeOf('function');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(currentBlocker!()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes or a save in progress. Leave this editor?'
    );
  });

  it('calls updateContent with approval: draft and updates status on successful save', async () => {
    vi.spyOn(galleryApi, 'content').mockResolvedValue({ data: [enContent] });
    const update = vi.spyOn(galleryApi, 'updateContent').mockResolvedValue({
      data: [{
        ...enContent,
        eyebrow: 'Clinical Results Draft',
        revision: 4,
        approval: 'draft',
      }],
    });
    const user = userEvent.setup();

    renderEditor();

    const eyebrow = await screen.findByLabelText(/eyebrow/i);
    await user.type(eyebrow, ' Draft');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        lang: 'en',
        expected_revision: 3,
        eyebrow: 'Clinical Results Draft',
        heading: 'Before & After Gallery',
        introduction: 'Explore our documented procedures and patient outcomes.',
        statistics: enContent.statistics,
        approval: 'draft',
      });
    });

    expect(await screen.findByText('Server saved revision 4 with status draft.')).toBeInTheDocument();
    expect(screen.getByText(/Revision 4 · Status: draft/)).toBeInTheDocument();
  });
});
