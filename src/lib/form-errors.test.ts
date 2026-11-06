import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { fieldErrors } from './form-errors';

describe('fieldErrors', () => {
  it('rewrites bracket indexes to dotted keys', () => {
    expect(fieldErrors(new ApiError(422, 'VALIDATION', 'Invalid', { 'stats[0].value': 'bad' }))).toEqual({
      'stats.0.value': 'bad',
    });
  });

  it('leaves already dotted keys unchanged', () => {
    expect(fieldErrors(new ApiError(422, 'VALIDATION', 'Invalid', { 'captions.en.alt_text': 'Required' }))).toEqual({
      'captions.en.alt_text': 'Required',
    });
  });

  it('returns an empty map when there are no field errors', () => {
    expect(fieldErrors(new ApiError(500, 'REQUEST_FAILED', 'Request failed.'))).toEqual({});
    expect(fieldErrors(new ApiError(422, 'VALIDATION', 'Invalid', {}))).toEqual({});
    expect(fieldErrors(new Error('network'))).toEqual({});
    expect(fieldErrors(null)).toEqual({});
    expect(fieldErrors('bad')).toEqual({});
  });

  it('omits non-string field messages', () => {
    const error = new ApiError(422, 'VALIDATION', 'Invalid', {
      title: 'Required',
      count: 1,
      note: null,
    } as unknown as Record<string, string>);
    expect(fieldErrors(error)).toEqual({ title: 'Required' });
  });
});

describe('admin form stack', () => {
  const schema = z.object({ title: z.string().min(1) });
  const resolver = zodResolver(schema);

  it('reports errors for invalid values', async () => {
    const result = await resolver({ title: '' }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(result.errors).toMatchObject({ title: { message: expect.any(String) } });
  });

  it('returns parsed values for valid input', async () => {
    const result = await resolver({ title: 'Case' }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ title: 'Case' });
  });
});
