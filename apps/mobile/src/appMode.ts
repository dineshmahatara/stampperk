import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'business' | 'customer';

const KEY = 'stampperk_app_mode';

/** Only merchant-side roles may enter Business mode. */
export function canUseBusinessMode(role?: string | null) {
  return role === 'MERCHANT_OWNER' || role === 'STAFF';
}

/** Pure customers stay in customer experience only. */
export function canSwitchToCustomerMode(role?: string | null) {
  return canUseBusinessMode(role);
}

export async function getAppMode(role?: string | null): Promise<AppMode> {
  if (!canUseBusinessMode(role)) return 'customer';
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'customer' ? 'customer' : 'business';
  } catch {
    return 'business';
  }
}

export async function setAppMode(role: string | null | undefined, mode: AppMode): Promise<AppMode> {
  if (mode === 'business' && !canUseBusinessMode(role)) {
    return 'customer';
  }
  if (mode === 'customer' && !canSwitchToCustomerMode(role) && role !== 'CUSTOMER') {
    return canUseBusinessMode(role) ? 'business' : 'customer';
  }
  try {
    if (canUseBusinessMode(role)) {
      await AsyncStorage.setItem(KEY, mode);
    } else {
      await AsyncStorage.removeItem(KEY);
      return 'customer';
    }
  } catch {
    /* ignore */
  }
  return mode;
}
