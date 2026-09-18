'use client';

import dynamic from 'next/dynamic';
import type { MapLocationValue } from './MapLocationPicker';

export type { MapLocationValue };

export const MapLocationPicker = dynamic(
  () => import('./MapLocationPicker').then((m) => m.MapLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--stampperk-line)] bg-[#F8F8FA] text-sm font-semibold text-[var(--stampperk-muted)]">
        Loading map…
      </div>
    ),
  },
);
