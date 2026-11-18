import { auth } from './auth-client';

export class ApiError extends Error {
  status: number;
  code: string;
  issue: string;
  constructor(status: number, code = '', issue = '') {
    super('API request failed');
    this.status = status;
    this.code = code;
    this.issue = issue;
  }
}

type ApiRequestOptions = { method?: string; body?: unknown; token?: string; signal?: AbortSignal };

/** Private API requests always bypass caches and retain the server's status code. */
export async function apiResponse(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  let token = options.token;
  if (!token) {
    const user = auth.currentUser;
    if (!user) throw new ApiError(401);
    token = await user.getIdToken();
  }
  const hasBody = options.body !== undefined;
  const response = await fetch('/api' + path, {
    method: options.method ?? (hasBody ? 'PUT' : 'GET'),
    cache: 'no-store',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    let payload: { code?: unknown; issue?: unknown } = {};
    try {
      const value = await response.json();
      if (value && typeof value === 'object') payload = value;
    } catch {
      /* Error pages may not be JSON. */
    }
    throw new ApiError(
      response.status,
      typeof payload.code === 'string' ? payload.code : '',
      typeof payload.issue === 'string' ? payload.issue : '',
    );
  }
  return response;
}

export async function apiJson<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return (await apiResponse(path, options)).json() as Promise<T>;
}

export async function apiOptionalJson<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T | null> {
  const response = await apiResponse(path, options);
  return response.status === 204 ? null : response.json();
}

export async function apiBlob(path: string, options?: ApiRequestOptions): Promise<Blob> {
  return (await apiResponse(path, options)).blob();
}
