'use client';

/** Round/square avatar for merchant logos or user photos. */
export function EntityAvatar({
  src,
  name,
  size = 'md',
  rounded = 'xl',
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'full' | 'xl' | 'lg';
  className?: string;
}) {
  const initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?';
  const box =
    size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';
  const radius = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-xl';

  if (src) {
    return (
      <span className={`relative inline-flex shrink-0 overflow-hidden bg-[#F4F5F7] ${box} ${radius} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-[#FFE8EA] font-extrabold text-[#FF5A5F] ${box} ${radius} ${className}`}
    >
      {initial}
    </span>
  );
}
