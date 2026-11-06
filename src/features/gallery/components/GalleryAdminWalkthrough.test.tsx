import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '../../../lib/api';
import { queryClient } from '../../../lib/query-client';
import { authApi } from '../../auth/services/auth.service';
import { galleryApi } from '../services/gallery.service';
import type { GalleryCase, GalleryContent, GalleryOptions } from '../types/gallery.types';
import { AdminApp } from '../../../app/AdminApp';
import { NavigationBoundary } from '../../../app/navigation';
import { adminRouteContracts } from '../../../app/route-contract';

const options: GalleryOptions = {
  procedures: [{ code: 'rhinoplasty', en: 'Rhinoplasty', ar: 'تجميل الأنف' }],
  timeframes: [{ code: '3-months', en: '3 Months', ar: '٣ أشهر' }],
};

const initialCase: GalleryCase = {
  id: 'case-101',
  revision: 1,
  published: false,
  display_order: 1,
  crop_attested: false,
  media_ready: false,
  captions: [],
  created_at: '2026-11-06T00:00:00Z',
  updated_at: '2026-11-06T00:00:00Z',
};

function setupRouter(initialPath: string) {
  window.history.replaceState({}, '', initialPath);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(authApi, 'session').mockResolvedValue({
    data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' },
  });
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
  const router = createBrowserRouter(
    [
      {
        element: <NavigationBoundary />,
        children: [{ element: <AdminApp />, children: adminRouteContracts }],
      },
    ],
    { basename: '/admin' }
  );
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/admin/');
});

describe('gallery admin end-to-end journey walkthrough', () => {
  it('walks through the full case journey: list -> create draft -> edit -> upload -> save -> publish -> return', async () => {
    let currentCase: GalleryCase = { ...initialCase };
    vi.spyOn(galleryApi, 'list').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 12,
    });
    const createSpy = vi.spyOn(galleryApi, 'create').mockImplementation(async () => {
      currentCase = { ...initialCase };
      return { data: currentCase };
    });
    vi.spyOn(galleryApi, 'get').mockImplementation(async (id) => {
      return { data: { ...currentCase, id } };
    });
    const uploadSpy = vi.spyOn(galleryApi, 'upload').mockImplementation(async (_id, _file, _rev, onProgress) => {
      onProgress?.(100);
      currentCase = {
        ...currentCase,
        revision: 2,
        media_ready: true,
        crop_attested: true,
        url: '/api/v1/gallery/case-101/media/display',
        thumbnail_url: '/api/v1/gallery/case-101/media/thumbnail',
      };
      return { data: currentCase };
    });
    const editSpy = vi.spyOn(galleryApi, 'edit').mockImplementation(async (_id, payload) => {
      currentCase = {
        ...currentCase,
        revision: 3,
        signed_consent_id: payload.signed_consent_id,
        procedure_tag: payload.procedure_tag,
        timeframe_badge: payload.timeframe_badge,
        before_position: payload.before_position,
        captions: payload.captions ?? [],
      };
      return { data: currentCase };
    });
    const publishSpy = vi.spyOn(galleryApi, 'publish').mockImplementation(async (_id, _rev, published) => {
      currentCase = { ...currentCase, revision: 4, published };
      return { data: currentCase };
    });

    const user = userEvent.setup();
    const router = setupRouter('/admin/gallery');

    // 1. Case list page rendered
    expect(await screen.findByRole('region', { name: 'Gallery case browser' })).toBeVisible();
    expect(await screen.findByText('No gallery cases match these filters.')).toBeVisible();

    // 2. Click Create case -> navigates to /admin/gallery/new
    await user.click(screen.getByRole('link', { name: 'Create case' }));
    expect(await screen.findByText('Create a draft case')).toBeVisible();
    expect(window.location.pathname).toBe('/admin/gallery/new');

    // 3. Create private draft -> navigates to /admin/gallery/case-101/edit
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(createSpy).toHaveBeenCalledOnce());
    expect(await screen.findByLabelText('Signed consent reference')).toBeVisible();
    expect(window.location.pathname).toBe('/admin/gallery/case-101/edit');

    // 4. Fill in consent, procedure, timeframe, position, and bilingual descriptions
    await user.type(screen.getByLabelText('Signed consent reference'), 'CONSENT-101');
    await user.click(screen.getByLabelText(/I verified this reference against/i));
    await user.selectOptions(screen.getByLabelText('Procedure'), 'rhinoplasty');
    await user.selectOptions(screen.getByLabelText('Timeframe'), '3-months');
    await user.selectOptions(screen.getByLabelText('Before image position'), 'left');

    await user.type(screen.getByLabelText('EN image description'), 'Rhinoplasty before and after');
    await user.type(screen.getByLabelText('EN caption'), 'Frontal symmetry at 3 months');
    await user.click(screen.getByLabelText('EN description reviewed and approved'));

    await user.type(screen.getByLabelText('AR image description'), 'صورة تجميل الأنف قبل وبعد');
    await user.type(screen.getByLabelText('AR caption'), 'تناسق أمامي بعد ٣ أشهر');
    await user.click(screen.getByLabelText('AR description reviewed and approved'));

    // 5. Upload image
    const file = new File(['fake-image'], 'comparison.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText('Combined image file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByText(/Upload complete/i)).toBeInTheDocument();
    expect(uploadSpy).toHaveBeenCalledOnce();

    // 6. Save changes
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(editSpy).toHaveBeenCalledOnce());
    expect(await screen.findByText('Case saved.')).toBeInTheDocument();
    expect(screen.getByText(/Case case-101 · Revision 3 · Unpublished/)).toBeVisible();

    // 7. Publish case
    await user.click(screen.getByRole('button', { name: 'Publish case' }));
    await waitFor(() => expect(publishSpy).toHaveBeenCalledWith('case-101', 3, true));
    expect(await screen.findByText(/Revision 4 · Published/)).toBeInTheDocument();

    // 8. Return to list
    await user.click(screen.getByRole('button', { name: 'Back to gallery' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery'));
    expect(screen.getByRole('region', { name: 'Gallery case browser' })).toBeVisible();

    router.dispose();
  });

  it('walks through bilingual section content editing and 409 conflict recovery', async () => {
    let enContent: GalleryContent = {
      type: 'gallery',
      lang: 'en',
      eyebrow: 'Our Results',
      heading: 'Before & After Transformations',
      introduction: 'Documented surgical and clinical results.',
      statistics: [{ key: 'cases', value: '250+', label: 'Successful Procedures' }],
      revision: 1,
      published: false,
      approval: 'draft',
    };
    let arContent: GalleryContent = {
      type: 'gallery',
      lang: 'ar',
      eyebrow: 'نتائجنا',
      heading: 'تحولات قبل وبعد',
      introduction: 'نتائج سريرية وجراحية موثقة.',
      statistics: [{ key: 'cases', value: '+٢٥٠', label: 'إجراء ناجح' }],
      revision: 1,
      published: false,
      approval: 'draft',
    };

    const contentSpy = vi.spyOn(galleryApi, 'content').mockImplementation(async () => ({
      data: [enContent, arContent],
    }));
    vi.spyOn(galleryApi, 'list').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    let updateAttempts = 0;
    const updateSpy = vi.spyOn(galleryApi, 'updateContent').mockImplementation(async (payload) => {
      updateAttempts += 1;
      if (updateAttempts === 1) {
        // Server revision advances concurrently to 2
        enContent = { ...enContent, revision: 2 };
        arContent = { ...arContent, revision: 2 };
        throw new ApiError(409, 'CONFLICT', 'Server revision changed concurrently');
      }
      if (payload.lang === 'en') {
        enContent = { ...enContent, ...payload, revision: 3, published: payload.approval === 'approved' };
        return { data: [enContent, arContent] };
      }
      arContent = { ...arContent, ...payload, revision: 3, published: payload.approval === 'approved' };
      return { data: [enContent, arContent] };
    });

    const user = userEvent.setup();
    const router = setupRouter('/admin/gallery');

    // 1. From list, click Section content -> navigates to /admin/gallery/content
    await user.click(await screen.findByRole('link', { name: 'Section content' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery/content'));
    expect(await screen.findByRole('heading', { name: 'Gallery section content', level: 1 })).toBeVisible();

    // 2. Edit English tab
    const headingInput = screen.getByLabelText(/heading/i);
    await user.clear(headingInput);
    await user.type(headingInput, 'Updated Clinical Transformations');

    // 3. Switch to Arabic tab while preserving English edits in memory
    const arTab = screen.getByRole('tab', { name: 'Arabic' });
    expect(arTab).toBeVisible();
    await user.click(arTab);
    expect(screen.getByLabelText(/heading/i)).toHaveAttribute('dir', 'rtl');

    // 4. Attempt save draft -> rejects with 409 ApiError
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledOnce());

    // 5. 409 conflict alert appears with Reapply my edits option
    expect(
      await screen.findByText(/Reload discards your edits. Reapply keeps them/i)
    ).toBeInTheDocument();
    const reapplyBtn = screen.getByRole('button', { name: 'Reapply my edits' });
    expect(reapplyBtn).toBeVisible();

    // 6. Click Reapply my edits (triggers background query.refetch to sync server revision)
    await user.click(reapplyBtn);
    expect(
      await screen.findByText(/Edits retained. Saving or publishing will overwrite/i)
    ).toBeInTheDocument();

    // 7. Save draft successfully after reapply
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/Server saved revision 3 with status draft/i)
    ).toBeInTheDocument();

    // 8. Return to gallery
    await user.click(screen.getByRole('button', { name: 'Back to gallery' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery'));
    expect(screen.getByRole('region', { name: 'Gallery case browser' })).toBeVisible();

    router.dispose();
  });
});
