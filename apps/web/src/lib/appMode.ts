/** Web app experience mode (not the JWT role). */

export type AppMode = 'business' | 'customer';

const KEY = 'stampperk_app_mode';

export function canUseBusinessMode(role?: string | null) {
  return role === 'MERCHANT_OWNER' || role === 'STAFF';
}

export function canSwitchToCustomerMode(role?: string | null) {
  return canUseBusinessMode(role);
}

export function getStoredAppMode(role?: string | null): AppMode {
  if (typeof window === 'undefined') {
    return canUseBusinessMode(role) ? 'business' : 'customer';
  }
  if (!canUseBusinessMode(role)) return 'customer';
  try {
    return localStorage.getItem(KEY) === 'customer' ? 'customer' : 'business';
  } catch {
    return 'business';
  }
}

export function setStoredAppMode(role: string | null | undefined, mode: AppMode): AppMode {
  if (typeof window === 'undefined') return mode;
  if (mode === 'business' && !canUseBusinessMode(role)) {
    localStorage.removeItem(KEY);
    return 'customer';
  }
  if (!canUseBusinessMode(role)) {
    localStorage.removeItem(KEY);
    return 'customer';
  }
  localStorage.setItem(KEY, mode);
  return mode;
}

/** Effective UI experience for dashboards. */
export function effectiveExperience(
  role?: string | null,
  mode?: AppMode | null,
): 'customer' | 'merchant' | 'admin' {
  if (role === 'SUPER_ADMIN') return 'admin';
  if (role === 'CUSTOMER') return 'customer';
  if (canUseBusinessMode(role) && mode === 'customer') return 'customer';
  if (canUseBusinessMode(role)) return 'merchant';
  return 'customer';
}
