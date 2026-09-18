import type { CreateLoyaltyProgramInput, StampScanInput } from '@stampperk/shared';

export type OfflineScanItem = StampScanInput & {
  offlineId: string;
  scannedAt: string;
  merchantId?: string | null;
};

export type OfflineEnrollItem = {
  type: 'ENROLL';
  offlineId: string;
  programId: string;
  programTitle?: string;
  merchantName?: string;
  createdAt: string;
};

export type OfflineProgramItem = {
  type: 'CREATE_PROGRAM';
  offlineId: string;
  payload: CreateLoyaltyProgramInput;
  merchantBootstrap?: {
    businessName: string;
    category: string;
    logoUrl?: string;
    phone?: string;
    city?: string;
    country: string;
  };
  createdAt: string;
  merchantId?: string | null;
};

export type OfflineQueueItem = OfflineEnrollItem | OfflineProgramItem;

export type SyncResult = {
  scansSynced: number;
  enrollsSynced: number;
  programsSynced: number;
  failed: number;
  errors: string[];
};
