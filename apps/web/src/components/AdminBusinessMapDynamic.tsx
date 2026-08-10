'use client';

import dynamic from 'next/dynamic';
import type { MapMerchantPin } from './AdminBusinessLeafletMap';

export type { MapMerchantPin };

export const AdminBusinessLeafletMap = dynamic(
  () => import('./AdminBusinessLeafletMap').then((m) => m.AdminBusinessLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-black/5 bg-[#F8F8FA] text-sm font-semibold text-[#8E8E93]">
        Loading map…
      </div>
    ),
  },
);

export const AdminBusinessGoogleMap = dynamic(
  () => import('./AdminBusinessGoogleMap').then((m) => m.AdminBusinessGoogleMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-black/5 bg-[#F8F8FA] text-sm font-semibold text-[#8E8E93]">
        Loading Google Maps…
      </div>
    ),
  },
);
