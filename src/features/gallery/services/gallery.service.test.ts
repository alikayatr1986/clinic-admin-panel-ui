import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminRequest, adminUpload } from '../../../lib/api';
import { galleryApi } from './gallery.service';

vi.mock('../../../lib/api', () => ({ adminRequest: vi.fn(), adminUpload: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('gallery API contracts', () => {
  it('encodes list filters and forwards cancellation to reads', () => {
    const signal = new AbortController().signal;
    galleryApi.list({ page: 2, page_size: 12, status: 'published', procedure_tag: 'nose & face' }, signal);
    expect(adminRequest).toHaveBeenCalledWith('/admin/api/gallery?page=2&page_size=12&status=published&procedure_tag=nose+%26+face', { signal });
    galleryApi.get('case/one ?', signal);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery/case%2Fone%20%3F', { signal });
    galleryApi.options(signal);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery-options', { signal });
  });

  it('sends draft and revision-aware lifecycle payloads', () => {
    galleryApi.create(3);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery', { method: 'POST', body: JSON.stringify({ display_order: 3 }) });
    const input = { expected_revision: 4, signed_consent_id: 'consent', captions: [] };
    galleryApi.edit('case/one', input);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery/case%2Fone', { method: 'PUT', body: JSON.stringify(input) });
    galleryApi.preview('case/one', 4);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery/case%2Fone/preview', { method: 'POST', body: JSON.stringify({ expected_revision: 4 }) });
    galleryApi.publish('case/one', 4, true);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery/case%2Fone/publish', { method: 'POST', body: JSON.stringify({ expected_revision: 4, published: true }) });
    galleryApi.remove('case/one', 5);
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery/case%2Fone', { method: 'DELETE', body: JSON.stringify({ expected_revision: 5 }) });
    galleryApi.withdrawConsent('consent/one');
    expect(adminRequest).toHaveBeenLastCalledWith('/admin/api/gallery-consents/consent%2Fone/withdraw', { method: 'POST' });
  });

  it('passes upload file, revision and progress callback to the transport', () => {
    const file = new File(['image'], 'case.jpg', { type: 'image/jpeg' });
    const progress = vi.fn();
    galleryApi.upload('case/one', file, 7, progress);
    expect(adminUpload).toHaveBeenCalledOnce();
    const [path, body, callback] = vi.mocked(adminUpload).mock.calls[0];
    expect(path).toBe('/admin/api/gallery/case%2Fone/media');
    expect(body.get('file')).toBe(file);
    expect(body.get('expected_revision')).toBe('7');
    expect(callback).toBe(progress);
  });
});
