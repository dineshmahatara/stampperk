import { OFFLINE_KEYS } from './keys';
import { cacheGet, cacheSet } from './queue';

export async function cacheMyQr(data: unknown) {
  await cacheSet(OFFLINE_KEYS.cacheQr, data);
}

export async function readCachedMyQr<T = unknown>() {
  return cacheGet<T>(OFFLINE_KEYS.cacheQr);
}

export async function cacheWallet(data: unknown) {
  await cacheSet(OFFLINE_KEYS.cacheWallet, data);
}

export async function readCachedWallet<T = unknown>() {
  return cacheGet<T>(OFFLINE_KEYS.cacheWallet);
}

export async function cachePrograms(data: unknown) {
  await cacheSet(OFFLINE_KEYS.cachePrograms, data);
}

export async function readCachedPrograms<T = unknown>() {
  return cacheGet<T>(OFFLINE_KEYS.cachePrograms);
}

export async function cacheMerchant(data: unknown) {
  await cacheSet(OFFLINE_KEYS.cacheMerchant, data);
}

export async function readCachedMerchant<T = unknown>() {
  return cacheGet<T>(OFFLINE_KEYS.cacheMerchant);
}
