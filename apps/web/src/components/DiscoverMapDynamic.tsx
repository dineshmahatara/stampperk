'use client';

import dynamic from 'next/dynamic';

export const DiscoverMap = dynamic(() => import('./DiscoverMap').then((m) => m.DiscoverMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#E8ECF0] text-sm font-semibold text-[#8E8E93]">
      Loading map…
    </div>
  ),
});
