import AsyncStorage from '@react-native-async-storage/async-storage';
import { OFFLINE_KEYS } from './keys';
import type { OfflineQueueItem, OfflineScanItem } from './types';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getOfflineScans(): Promise<OfflineScanItem[]> {
  return readJson<OfflineScanItem[]>(OFFLINE_KEYS.scans, []);
}

export async function setOfflineScans(scans: OfflineScanItem[]) {
  await writeJson(OFFLINE_KEYS.scans, scans);
}

export async function enqueueScan(item: OfflineScanItem): Promise<number> {
  const scans = await getOfflineScans();
  if (scans.some((s) => s.offlineId === item.offlineId)) return scans.length;
  const next = [...scans, item];
  await setOfflineScans(next);
  return next.length;
}

export async function getOfflineActions(): Promise<OfflineQueueItem[]> {
  return readJson<OfflineQueueItem[]>(OFFLINE_KEYS.actions, []);
}

export async function setOfflineActions(items: OfflineQueueItem[]) {
  await writeJson(OFFLINE_KEYS.actions, items);
}

export async function enqueueAction(item: OfflineQueueItem): Promise<number> {
  const items = await getOfflineActions();
  if (items.some((i) => i.offlineId === item.offlineId)) return items.length;
  const next = [...items, item];
  await setOfflineActions(next);
  return next.length;
}

export async function pendingCounts(): Promise<{
  scans: number;
  actions: number;
  total: number;
}> {
  const [scans, actions] = await Promise.all([getOfflineScans(), getOfflineActions()]);
  return { scans: scans.length, actions: actions.length, total: scans.length + actions.length };
}

export async function cacheSet(key: string, value: unknown) {
  await writeJson(key, { savedAt: new Date().toISOString(), data: value });
}

export async function cacheGet<T>(key: string): Promise<{ savedAt: string; data: T } | null> {
  return readJson(key, null);
}
