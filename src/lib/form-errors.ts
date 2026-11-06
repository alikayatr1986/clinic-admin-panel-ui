import { ApiError } from './api';

const BRACKET_INDEX = /\[(\d+)\]/g;

// Maps only server field errors. Pair with describeError for the banner message.
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fields) return {};
  return Object.fromEntries(
    Object.entries(error.fields)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, message]) => [key.replace(BRACKET_INDEX, '.$1'), message]),
  );
}
