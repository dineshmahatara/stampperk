const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  qrToken?: string;
  emailVerified?: boolean;
  photoUrl?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  captcha?: { id: string; question: string };
  lockedUntil?: string;
  raw: unknown;

  constructor(
    message: string,
    opts: {
      status: number;
      code?: string;
      captcha?: { id: string; question: string };
      lockedUntil?: string;
      raw?: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.captcha = opts.captcha;
    this.lockedUntil = opts.lockedUntil;
    this.raw = opts.raw;
  }
}

const MERCHANT_KEY = 'stampz_active_merchant_id';

export function getActiveMerchantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(MERCHANT_KEY);
}

export function setActiveMerchantId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem(MERCHANT_KEY, id);
  else localStorage.removeItem(MERCHANT_KEY);
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & {
    token?: string;
    merchantId?: string | null;
    body?: BodyInit | Record<string, unknown> | unknown[] | null;
  } = {},
): Promise<T> {
  const { token, merchantId, headers, body, ...rest } = options;
  const activeMerchant = merchantId === undefined ? getActiveMerchantId() : merchantId;
  const serialized =
    body == null || typeof body === 'string' || body instanceof FormData || body instanceof Blob
      ? body
      : JSON.stringify(body);
  const res = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    body: serialized,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeMerchant ? { 'X-Merchant-Id': activeMerchant } : {}),
      ...headers,
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = typeof data.message === 'object' && data.message ? data.message : data;
    const rawMsg = payload.message ?? data.message ?? data.error;
    const message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg || `Request failed (${res.status})`;
    throw new ApiError(String(message), {
      status: res.status,
      code: payload.code || data.code,
      captcha: payload.captcha || data.captcha,
      lockedUntil: payload.lockedUntil || data.lockedUntil,
      raw: data,
    });
  }
  return data as T;
}

export async function uploadMedia(
  file: File,
  options: { token: string; merchantId?: string | null; scope?: 'platform' | string },
): Promise<{ url: string; path: string }> {
  const activeMerchant =
    options.merchantId === undefined ? getActiveMerchantId() : options.merchantId;
  const form = new FormData();
  form.append('file', file);
  const qs = options.scope ? `?scope=${encodeURIComponent(options.scope)}` : '';
  const res = await fetch(`${API_URL}/api/media/upload${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...(activeMerchant && !options.scope ? { 'X-Merchant-Id': activeMerchant } : {}),
    },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Upload failed (${res.status})`);
  }
  return data as { url: string; path: string };
}

export { API_URL };
