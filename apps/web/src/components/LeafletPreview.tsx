'use client';

type LeafletPreviewProps = {
  layoutId: string;
  businessName: string;
  headline: string;
  offerText: string;
  logoUrl?: string | null;
  promoImageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  accentColor?: string | null;
  qrTarget: string;
  className?: string;
  /** Compact thumbnail for lists */
  compact?: boolean;
};

const DEFAULT_ACCENT = '#FF5A5F';

function QrImg({ target, size }: { target: string; size: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(target)}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR" className="rounded-lg bg-white p-1" width={size} height={size} />;
}

export function LeafletPreview({
  layoutId,
  businessName,
  headline,
  offerText,
  logoUrl,
  promoImageUrl,
  phone,
  address,
  accentColor,
  qrTarget,
  className = '',
  compact = false,
}: LeafletPreviewProps) {
  const accent = accentColor || DEFAULT_ACCENT;
  const shell = compact ? 'scale-[0.55] origin-top-left' : '';

  if (layoutId === 'story-square') {
    return (
      <div className={`${className} ${shell}`}>
        <div
          className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl shadow-xl"
          style={{ background: accent }}
        >
          {promoImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promoImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 z-[1] space-y-2 p-5 text-white">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover" />
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-xs font-bold uppercase tracking-wide opacity-90">{businessName}</div>
                <div className="truncate text-lg font-extrabold">{headline}</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-white/90">{offerText}</p>
            <div className="flex items-end justify-between gap-3 pt-1">
              <div className="text-[10px] opacity-80">
                {phone}
                {address ? <div>{address}</div> : null}
              </div>
              <QrImg target={qrTarget} size={72} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === 'offer-band') {
    return (
      <div className={`${className} ${shell}`}>
        <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-xl">
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: accent }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl bg-white object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xs font-bold text-white">
                LOGO
              </div>
            )}
            <div className="min-w-0 text-white">
              <div className="truncate text-xs font-bold uppercase opacity-90">{businessName}</div>
              <div className="truncate text-xl font-black">{offerText}</div>
            </div>
          </div>
          <div className="flex gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold text-[#1C1C1E]">{headline}</div>
              {phone || address ? (
                <div className="mt-2 text-xs font-semibold text-[#8E8E93]">
                  {phone}
                  {address ? <div className="mt-0.5">{address}</div> : null}
                </div>
              ) : null}
            </div>
            <QrImg target={qrTarget} size={88} />
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === 'minimal-qr') {
    return (
      <div className={`${className} ${shell}`}>
        <div className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-4 rounded-2xl border border-black/8 bg-white px-6 py-8 text-center shadow-xl">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-sm font-bold text-white"
              style={{ background: accent }}
            >
              LOGO
            </div>
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#8E8E93]">{businessName}</div>
            <div className="mt-1 text-lg font-extrabold text-[#1C1C1E]">{headline}</div>
            <p className="mt-2 text-sm font-semibold" style={{ color: accent }}>
              {offerText}
            </p>
          </div>
          <QrImg target={qrTarget} size={140} />
          {(phone || address) && (
            <div className="text-[11px] font-semibold text-[#8E8E93]">
              {phone}
              {address ? <div>{address}</div> : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  // hero-a5 default
  return (
    <div className={`${className} ${shell}`}>
      <div className="mx-auto flex w-full max-w-[320px] flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-xl">
        <div className="relative aspect-[4/3] bg-[#E8ECF0]">
          {promoImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promoImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-[#8E8E93]">Promo photo</div>
          )}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-[10px] font-bold text-white"
                style={{ background: accent }}
              >
                LOGO
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">{businessName}</div>
              <div className="truncate text-base font-extrabold text-[#1C1C1E]">{headline}</div>
            </div>
          </div>
          <p className="rounded-xl px-3 py-2 text-sm font-bold text-white" style={{ background: accent }}>
            {offerText}
          </p>
          <div className="flex items-end justify-between gap-3">
            <div className="text-[10px] font-semibold text-[#8E8E93]">
              {phone}
              {address ? <div className="mt-0.5">{address}</div> : null}
              <div className="mt-1 opacity-70">Scan to visit</div>
            </div>
            <QrImg target={qrTarget} size={80} />
          </div>
        </div>
      </div>
    </div>
  );
}
