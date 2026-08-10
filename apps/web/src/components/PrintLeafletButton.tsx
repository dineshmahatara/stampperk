'use client';

import { useEffect } from 'react';

export function PrintLeafletButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-[#1C1C1E] px-3 py-1.5 text-xs font-bold text-white"
    >
      Print
    </button>
  );
}
