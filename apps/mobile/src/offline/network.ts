import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

export function offlineId(prefix = 'off') {
  try {
    return `${prefix}-${Crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    return true;
  }
}

export function subscribeNetwork(onChange: (online: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    const online =
      state.isConnected !== false && state.isInternetReachable !== false;
    onChange(online);
  });
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(e: unknown): boolean {
  if (e instanceof NetworkError) return true;
  if (e instanceof TypeError) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /network error|failed to fetch|network request failed|cannot reach api/i.test(msg);
}
