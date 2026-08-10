'use client';

/** Stampz Verified checkmark — not related to campaign badgeText. */
export function VerifiedBadge({
  size = 'md',
  className = '',
  showLabel = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}) {
  const dim = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title="Stampz Verified business"
    >
      <svg width={dim} height={dim} viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <circle cx="12" cy="12" r="11" fill="#FF5A5F" />
        <path
          d="M7.5 12.2 10.4 15l6.1-6.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabel && (
        <span className="text-xs font-bold text-[#FF5A5F]">Verified</span>
      )}
      <span className="sr-only">Stampz Verified</span>
    </span>
  );
}
