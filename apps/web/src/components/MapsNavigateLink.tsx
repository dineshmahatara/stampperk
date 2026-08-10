'use client';

import { useMemo } from 'react';
import { mapsNavigateUrl, type MapsTarget } from '@/lib/geo';

export function MapsNavigateLink({
  target,
  children,
  className,
  prefer = 'auto',
}: {
  target: MapsTarget;
  children: React.ReactNode;
  className?: string;
  prefer?: 'auto' | 'google' | 'apple';
}) {
  const href = useMemo(() => mapsNavigateUrl(target, prefer), [target, prefer]);
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} title="Open in Maps">
      {children}
    </a>
  );
}
