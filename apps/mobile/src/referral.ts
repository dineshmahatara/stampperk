import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stampz_referral_v1';

export type StoredReferral = {
  referralCode: string;
  referralMerchantId?: string;
  referralProgramId?: string;
};

export async function saveMobileReferral(data: StoredReferral) {
  const code = data.referralCode?.trim().toUpperCase();
  if (!code) return;
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...data, referralCode: code }));
}

export async function readMobileReferral(): Promise<StoredReferral | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    return parsed?.referralCode ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearMobileReferral() {
  await AsyncStorage.removeItem(KEY);
}
