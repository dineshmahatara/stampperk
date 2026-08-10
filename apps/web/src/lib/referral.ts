/** Persist invite attribution across register / public business pages. */
const KEY = 'stampz_referral_v1';

export type StoredReferral = {
  referralCode: string;
  referralMerchantId?: string;
  referralProgramId?: string;
  merchantSlug?: string;
};

export function saveReferral(data: StoredReferral) {
  if (typeof window === 'undefined') return;
  const code = data.referralCode?.trim().toUpperCase();
  if (!code) return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...data,
      referralCode: code,
    }),
  );
}

export function readReferral(): StoredReferral | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed?.referralCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearReferral() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function captureReferralFromSearch(search: string | URLSearchParams) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const ref = params.get('ref') || params.get('referral') || '';
  if (!ref.trim()) return null;
  const data: StoredReferral = {
    referralCode: ref.trim().toUpperCase(),
    referralMerchantId: params.get('merchant') || undefined,
    referralProgramId: params.get('program') || undefined,
  };
  saveReferral(data);
  return data;
}
