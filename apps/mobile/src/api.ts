import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkError } from './offline/network';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const MERCHANT_KEY = 'stampz_active_merchant_id';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  qrToken?: string;
  emailVerified?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  captcha?: { id: string; question: string };
  lockedUntil?: string;

  constructor(
    message: string,
    opts: {
      status: number;
      code?: string;
      captcha?: { id: string; question: string };
      lockedUntil?: string;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.captcha = opts.captcha;
    this.lockedUntil = opts.lockedUntil;
  }
}

export async function getActiveMerchantId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(MERCHANT_KEY);
  } catch {
    return null;
  }
}

export async function setActiveMerchantId(id: string | null) {
  try {
    if (id) await AsyncStorage.setItem(MERCHANT_KEY, id);
    else await AsyncStorage.removeItem(MERCHANT_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; merchantId?: string | null } = {},
): Promise<T> {
  const { token, merchantId, headers, ...rest } = options;
  const activeMerchant =
    merchantId === undefined ? await getActiveMerchantId() : merchantId;
  const url = `${API_URL}/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(activeMerchant ? { 'X-Merchant-Id': activeMerchant } : {}),
        ...(headers || {}),
      },
    });
  } catch {
    throw new NetworkError(
      `Network error — cannot reach API at ${API_URL}. Offline queue will sync when you are back online.`,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = typeof data.message === 'object' && data.message ? data.message : data;
    const raw = payload.message ?? data.message ?? data.error;
    const msg = Array.isArray(raw) ? raw.join(', ') : raw || `HTTP ${res.status}`;
    throw new ApiError(String(msg), {
      status: res.status,
      code: payload.code || data.code,
      captcha: payload.captcha || data.captcha,
      lockedUntil: payload.lockedUntil || data.lockedUntil,
    });
  }
  return data as T;
}

export async function uploadMedia(
  file: { uri: string; name?: string; type?: string },
  options: { token: string; merchantId?: string | null } = { token: '' },
): Promise<{ url: string; path: string }> {
  const activeMerchant =
    options.merchantId === undefined ? await getActiveMerchantId() : options.merchantId;
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'logo.jpg',
    type: file.type || 'image/jpeg',
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(activeMerchant ? { 'X-Merchant-Id': activeMerchant } : {}),
      },
      body: form,
    });
  } catch {
    throw new NetworkError(`Network error — cannot reach API at ${API_URL}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Upload failed (${res.status})`);
  }
  return data as { url: string; path: string };
}

export { API_URL };
