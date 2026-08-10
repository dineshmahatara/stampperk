'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DiscoverView } from '@/components/DiscoverView';

/** Public discover — logged-in users stay in the dashboard shell. */
export default function DiscoverPage() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) {
      router.replace('/dashboard/discover');
    }
  }, [loading, token, router]);

  if (loading || token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8ECF0] text-sm font-semibold text-[#8E8E93]">
        Loading map…
      </div>
    );
  }

  return <DiscoverView />;
}
