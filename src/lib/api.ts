interface ErrorEnvelope {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function csrfToken(): string | null {
  const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('admin_csrf='));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice('admin_csrf='.length));
  } catch {
    return null;
  }
}

export async function adminRequest<T>(path: `/admin/api/${string}`, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/admin/api/login') {
    const token = csrfToken();
    if (!token) throw new ApiError(403, 'CSRF_MISSING', 'Security token is missing. Sign in again.');
    headers.set('X-CSRF-Token', token);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, method, headers, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the clinic server. Try again.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server sent an unexpected response.');
  }
  if (!response.ok) {
    const error = (body as ErrorEnvelope)?.error;
    throw new ApiError(response.status, error?.code ?? 'REQUEST_FAILED', error?.message ?? 'Request failed.', error?.fields);
  }
  return body as T;
}

// Fetch does not expose upload progress, so media writes use the same cookie/CSRF
// contract through XHR. The Go API remains the sole source of validation.
export function adminUpload<T>(path: `/admin/api/${string}`, body: FormData, onProgress: (percent: number) => void): Promise<T> {
  const token = csrfToken();
  if (!token) return Promise.reject(new ApiError(403, 'CSRF_MISSING', 'Security token is missing. Sign in again.'));
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', path);
    request.timeout = 120_000;
    request.withCredentials = true;
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('X-CSRF-Token', token);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the clinic server. Try again.'));
    request.onabort = () => reject(new ApiError(0, 'UPLOAD_ABORTED', 'Upload was interrupted. Try again.'));
    request.ontimeout = () => reject(new ApiError(0, 'UPLOAD_TIMEOUT', 'Upload timed out. Try again.'));
    request.onload = () => {
      let response: unknown;
      try { response = JSON.parse(request.responseText); }
      catch { reject(new ApiError(request.status, 'INVALID_RESPONSE', 'The server sent an unexpected response.')); return; }
      if (request.status < 200 || request.status >= 300) {
        const error = (response as ErrorEnvelope)?.error;
        reject(new ApiError(request.status, error?.code ?? 'REQUEST_FAILED', error?.message ?? 'Upload failed.', error?.fields));
        return;
      }
      resolve(response as T);
    };
    request.send(body);
  });
}

