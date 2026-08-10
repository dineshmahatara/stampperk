import { api, getActiveMerchantId } from '../api';
import {
  getOfflineActions,
  getOfflineScans,
  setOfflineActions,
  setOfflineScans,
} from './queue';
import type { OfflineQueueItem, OfflineScanItem, SyncResult } from './types';

export async function syncOfflineQueue(token: string): Promise<SyncResult> {
  const result: SyncResult = {
    scansSynced: 0,
    enrollsSynced: 0,
    programsSynced: 0,
    failed: 0,
    errors: [],
  };

  const scans = await getOfflineScans();
  if (scans.length) {
    const byMerchant = new Map<string, OfflineScanItem[]>();
    for (const scan of scans) {
      const key = scan.merchantId || '__active__';
      const list = byMerchant.get(key) || [];
      list.push(scan);
      byMerchant.set(key, list);
    }

    const remaining: OfflineScanItem[] = [];
    for (const [merchantKey, group] of byMerchant) {
      try {
        const merchantId = merchantKey === '__active__' ? undefined : merchantKey;
        const res = await api<{
          synced: number;
          results?: { ok: boolean; error?: string; offlineId?: string }[];
        }>('/qr/sync-offline', {
          method: 'POST',
          token,
          merchantId: merchantId ?? null,
          body: JSON.stringify({ scans: group }),
        });
        result.scansSynced += res.synced || 0;
        const failedIds = new Set(
          (res.results || []).filter((r) => !r.ok).map((r) => r.offlineId).filter(Boolean),
        );
        for (const item of group) {
          if (failedIds.has(item.offlineId)) {
            remaining.push(item);
            result.failed += 1;
            const err = (res.results || []).find((r) => r.offlineId === item.offlineId)?.error;
            if (err) result.errors.push(err);
          }
        }
      } catch (e) {
        remaining.push(...group);
        result.failed += group.length;
        result.errors.push(e instanceof Error ? e.message : 'Scan sync failed');
      }
    }
    await setOfflineScans(remaining);
  }

  const actions = await getOfflineActions();
  const left: OfflineQueueItem[] = [];
  for (const action of actions) {
    try {
      if (action.type === 'ENROLL') {
        await api(`/loyalty/programs/${action.programId}/enroll`, {
          method: 'POST',
          token,
        });
        result.enrollsSynced += 1;
      } else if (action.type === 'CREATE_PROGRAM') {
        if (action.merchantBootstrap) {
          await api('/merchants', {
            method: 'POST',
            token,
            body: JSON.stringify(action.merchantBootstrap),
          });
        }
        await api('/loyalty/programs', {
          method: 'POST',
          token,
          merchantId: action.merchantId ?? (await getActiveMerchantId()),
          body: JSON.stringify(action.payload),
        });
        result.programsSynced += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action sync failed';
      // Treat already-enrolled as success
      if (action.type === 'ENROLL' && /already|exists|upsert/i.test(msg)) {
        result.enrollsSynced += 1;
        continue;
      }
      left.push(action);
      result.failed += 1;
      result.errors.push(msg);
    }
  }
  await setOfflineActions(left);

  return result;
}
