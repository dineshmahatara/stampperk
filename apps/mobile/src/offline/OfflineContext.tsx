import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { getActiveMerchantId } from '../api';
import { cachePrograms, cacheWallet, cacheMyQr } from './cache';
import { isOnline, isNetworkError, offlineId, subscribeNetwork } from './network';
import {
  enqueueAction,
  enqueueScan,
  pendingCounts,
} from './queue';
import { syncOfflineQueue } from './sync';
import type {
  OfflineEnrollItem,
  OfflineProgramItem,
  OfflineScanItem,
  SyncResult,
} from './types';
import type { CreateLoyaltyProgramInput } from '@stampz/shared';

type OfflineContextValue = {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSync: SyncResult | null;
  refreshPending: () => Promise<void>;
  syncNow: (token: string) => Promise<SyncResult>;
  queueStamp: (input: {
    customerQrToken: string;
    programId?: string;
    saleAmount?: number;
    token: string;
  }) => Promise<{ queued: boolean; message: string; pending: number }>;
  queueEnroll: (input: {
    programId: string;
    programTitle?: string;
    merchantName?: string;
  }) => Promise<{ pending: number }>;
  queueCreateProgram: (input: {
    program: CreateLoyaltyProgramInput;
    merchantBootstrap?: OfflineProgramItem['merchantBootstrap'];
  }) => Promise<{ pending: number }>;
  rememberQr: (data: unknown) => Promise<void>;
  rememberWallet: (data: unknown) => Promise<void>;
  rememberPrograms: (data: unknown) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({
  children,
  token,
}: {
  children: ReactNode;
  token?: string | null;
}) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const refreshPending = useCallback(async () => {
    const c = await pendingCounts();
    setPending(c.total);
  }, []);

  const syncNow = useCallback(
    async (authToken: string) => {
      if (syncing) {
        return lastSync || {
          scansSynced: 0,
          enrollsSynced: 0,
          programsSynced: 0,
          failed: 0,
          errors: [],
        };
      }
      setSyncing(true);
      try {
        const res = await syncOfflineQueue(authToken);
        setLastSync(res);
        await refreshPending();
        return res;
      } finally {
        setSyncing(false);
      }
    },
    [lastSync, refreshPending, syncing],
  );

  useEffect(() => {
    let mounted = true;
    isOnline().then((v) => {
      if (mounted) setOnline(v);
    });
    refreshPending();
    const unsub = subscribeNetwork((v) => {
      setOnline(v);
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        isOnline().then(setOnline);
        refreshPending();
      }
    });
    return () => {
      mounted = false;
      unsub();
      appSub.remove();
    };
  }, [refreshPending]);

  // Auto-sync when back online
  useEffect(() => {
    if (!online || !token || pending === 0 || syncing) return;
    const t = setTimeout(() => {
      syncNow(token).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [online, token, pending, syncing, syncNow]);

  const queueStamp = useCallback(
    async (input: {
      customerQrToken: string;
      programId?: string;
      saleAmount?: number;
      token: string;
    }) => {
      const merchantId = await getActiveMerchantId();
      const item: OfflineScanItem = {
        customerQrToken: input.customerQrToken.trim(),
        programId: input.programId,
        saleAmount: input.saleAmount,
        offlineId: offlineId('scan'),
        scannedAt: new Date().toISOString(),
        merchantId,
      };
      const count = await enqueueScan(item);
      setPending((await pendingCounts()).total);
      return {
        queued: true,
        message: 'Saved offline — will sync when online (creates card if needed)',
        pending: count,
      };
    },
    [],
  );

  const queueEnroll = useCallback(
    async (input: { programId: string; programTitle?: string; merchantName?: string }) => {
      const item: OfflineEnrollItem = {
        type: 'ENROLL',
        offlineId: offlineId('enroll'),
        programId: input.programId,
        programTitle: input.programTitle,
        merchantName: input.merchantName,
        createdAt: new Date().toISOString(),
      };
      const count = await enqueueAction(item);
      setPending((await pendingCounts()).total);
      return { pending: count };
    },
    [],
  );

  const queueCreateProgram = useCallback(
    async (input: {
      program: CreateLoyaltyProgramInput;
      merchantBootstrap?: OfflineProgramItem['merchantBootstrap'];
    }) => {
      const merchantId = await getActiveMerchantId();
      const item: OfflineProgramItem = {
        type: 'CREATE_PROGRAM',
        offlineId: offlineId('program'),
        payload: input.program,
        merchantBootstrap: input.merchantBootstrap,
        createdAt: new Date().toISOString(),
        merchantId,
      };
      const count = await enqueueAction(item);
      setPending((await pendingCounts()).total);
      return { pending: count };
    },
    [],
  );

  const value = useMemo<OfflineContextValue>(
    () => ({
      online,
      pending,
      syncing,
      lastSync,
      refreshPending,
      syncNow,
      queueStamp,
      queueEnroll,
      queueCreateProgram,
      rememberQr: cacheMyQr,
      rememberWallet: cacheWallet,
      rememberPrograms: cachePrograms,
    }),
    [
      online,
      pending,
      syncing,
      lastSync,
      refreshPending,
      syncNow,
      queueStamp,
      queueEnroll,
      queueCreateProgram,
    ],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return ctx;
}

export function useOfflineOptional() {
  return useContext(OfflineContext);
}

export { isNetworkError, offlineId };
