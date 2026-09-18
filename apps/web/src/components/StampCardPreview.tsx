'use client';

import { useRef, useState } from 'react';
import { categoryLabelFromSlug } from '@stampperk/shared';

export type ProfileContact = {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  deliveryEnabled?: boolean | null;
  tagline?: string | null;
  slug?: string | null;
  contactPerson?: string | null;
};

export type StampCardPreviewProps = {
  businessName: string;
  categorySlug?: string;
  categoryLabel?: string;
  logoUrl?: string;
  /** Front cover promo / atmosphere photo */
  promoImageUrl?: string;
  /** Zoom / size of logo badge on the card */
  logoScale?: number;
  /** Horizontal pan as % inside the circle (-50..50) */
  logoOffsetX?: number;
  /** Vertical pan as % inside the circle (-50..50) */
  logoOffsetY?: number;
  /** Logo badge X position on card front (% from left, 0–100) */
  logoPosX?: number;
  /** Logo badge Y position on card front (% from top of front area, 0–100) */
  logoPosY?: number;
  tagline?: string;
  totalStamps: number;
  filledStamps?: number;
  rewardTitle: string;
  rewardDescription?: string;
  /** Front panel / brand color */
  stampColor?: string;
  emptyStampColor?: string;
  /** Back panel cream color */
  accentColor?: string;
  fontStyle?: 'sans' | 'rounded' | 'display' | string | null;
  className?: string;
  doubleSided?: boolean;
  profile?: ProfileContact;
  expiryLabel?: string;
  terms?: string[];
};

const DEFAULT_TERMS = [
  'One stamp per purchase',
  'Not valid with other offers',
  'Lost card cannot be replaced',
  'This card is non-transferable',
];

const GOLD = '#C9B08A';
const CREAM = '#F3EEE4';
const INK = '#16352A';

function hostFromUrl(raw?: string | null) {
  if (!raw) return '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 36);
}

function socialPath(raw?: string | null) {
  if (!raw) return '';
  const cleaned = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  const handle = parts.length > 1 ? parts[parts.length - 1] : cleaned;
  return handle.startsWith('/') ? handle : `/${handle.replace(/^@/, '')}`;
}

function fontFamily(style?: string | null) {
  if (style === 'rounded') return 'ui-rounded, "Nunito", "Segoe UI Rounded", system-ui, sans-serif';
  if (style === 'display') return 'ui-serif, Georgia, "Times New Roman", serif';
  return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
}

function stampGridCols(count: number) {
  if (count <= 6) return 3;
  if (count <= 10) return 5;
  if (count <= 16) return 4;
  return 5;
}

export function StampCardPreview({
  businessName,
  categorySlug,
  categoryLabel,
  logoUrl,
  promoImageUrl,
  logoScale = 1,
  logoOffsetX = 0,
  logoOffsetY = 0,
  logoPosX = 50,
  logoPosY = 32,
  tagline,
  totalStamps,
  filledStamps = 0,
  rewardTitle,
  stampColor = INK,
  emptyStampColor = GOLD,
  accentColor = CREAM,
  fontStyle = 'sans',
  className = '',
  doubleSided = true,
  profile,
  expiryLabel,
  terms = DEFAULT_TERMS,
}: StampCardPreviewProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const drag = useRef<{ startX: number; flipped: boolean } | null>(null);
  const label = categoryLabel || (categorySlug ? categoryLabelFromSlug(categorySlug) : '');
  const slots = Math.max(3, Math.min(30, totalStamps));
  const visibleSlots = Math.min(slots, 20);
  const cols = stampGridCols(visibleSlots);
  const location = [profile?.address, profile?.city].filter(Boolean).join(', ') || profile?.city || '';
  const displayTagline = tagline || profile?.tagline || label || 'Loyalty rewards';
  const website = hostFromUrl(profile?.website);
  const social =
    socialPath(profile?.instagram) ||
    socialPath(profile?.facebook) ||
    socialPath(profile?.tiktok) ||
    (website ? `/${website.split('/')[0]}` : '');
  const offerLine = `Collect ${slots} stamps · Get ${rewardTitle || '1 free reward'}`;
  const qrTarget =
    typeof window !== 'undefined' && profile?.slug
      ? `${window.location.origin}/b/${profile.slug}`
      : profile?.website || 'https://stampperk.app';
  const ff = fontFamily(fontStyle);
  const emptyTone = emptyStampColor || GOLD;

  function flip() {
    setSide((s) => (s === 'front' ? 'back' : 'front'));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!doubleSided) return;
    drag.current = { startX: e.clientX, flipped: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!doubleSided || !drag.current || drag.current.flipped) return;
    if (Math.abs(e.clientX - drag.current.startX) >= 48) {
      drag.current.flipped = true;
      flip();
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!doubleSided || !drag.current) return;
    const { startX, flipped } = drag.current;
    drag.current = null;
    if (!flipped && Math.abs(e.clientX - startX) < 10) flip();
  }

  const front = (
    <div
      className="relative flex h-[300px] w-full flex-col overflow-hidden rounded-[24px] border border-black/8 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
      style={{
        fontFamily: ff,
        background: stampColor,
      }}
    >
      {promoImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={promoImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.72) 100%),
                linear-gradient(0deg, ${stampColor}99 0%, transparent 55%)
              `,
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.14), transparent 42%),
              radial-gradient(ellipse at 85% 90%, rgba(0,0,0,0.28), transparent 48%),
              ${stampColor}
            `,
          }}
        />
      )}

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div
            className="absolute flex items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            style={{
              width: 72,
              height: 72,
              left: `${logoPosX}%`,
              top: `${logoPosY}%`,
              transform: `translate(-50%, -50%) scale(${logoScale})`,
              transformOrigin: 'center center',
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover"
                style={{
                  transform: `translate(${logoOffsetX}%, ${logoOffsetY}%)`,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <span className="text-[11px] font-extrabold tracking-wide" style={{ color: stampColor }}>
                LOGO
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-5 px-5 text-center">
            <div className="mx-auto mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              Stamp card
            </div>
            <div
              className={`max-w-full truncate text-white drop-shadow ${
                fontStyle === 'display' ? 'text-[24px] font-bold tracking-tight' : 'text-[22px] font-black tracking-[0.02em]'
              }`}
            >
              {businessName || 'Your Business'}
            </div>
            <div className="mt-1.5 max-w-[92%] truncate mx-auto text-[12px] font-semibold text-white/85">
              {displayTagline}
            </div>
            <div className="mt-2 text-[11px] font-bold text-white/75">{offerLine}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const contactRows = [
    profile?.contactPerson ? { icon: '👤', text: profile.contactPerson } : null,
    profile?.email ? { icon: '✉', text: profile.email } : null,
    profile?.phone ? { icon: '☎', text: profile.phone } : null,
    location ? { icon: '⌖', text: location } : null,
  ].filter(Boolean) as { icon: string; text: string }[];

  const back = (
    <div
      className="relative flex h-[300px] w-full flex-col overflow-hidden rounded-[24px] border border-black/8 shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
      style={{ background: accentColor, color: stampColor, fontFamily: ff }}
    >
      <div className="flex min-h-0 flex-1 gap-3 px-4 pb-2 pt-3.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-black tracking-wide">
            {businessName || 'Your Business'}
          </div>
          <div className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">
            {displayTagline}
          </div>
          {website && <div className="mt-1 truncate text-[11px] font-semibold opacity-65">{website}</div>}

          <div className="mt-2 text-[10px] font-bold leading-snug opacity-90">{offerLine}</div>

          <div
            className="mt-2.5 grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: visibleSlots }).map((_, i) => {
              const isReward = i === visibleSlots - 1 && (slots <= visibleSlots || i === slots - 1);
              const isFilled = i < filledStamps;
              return (
                <div
                  key={i}
                  className="relative flex aspect-square items-center justify-center overflow-hidden rounded-full border text-[9px] font-bold"
                  style={{
                    borderStyle: isFilled ? 'solid' : 'dashed',
                    borderColor: isFilled ? stampColor : `${emptyTone}cc`,
                    background: isFilled
                      ? logoUrl
                        ? '#fff'
                        : `${stampColor}14`
                      : `${emptyTone}22`,
                    color: stampColor,
                    boxShadow: isFilled ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
                  }}
                >
                  {isFilled && logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : isReward ? (
                    '★'
                  ) : (
                    <span style={{ opacity: isFilled ? 1 : 0.55 }}>{i + 1}</span>
                  )}
                  {isFilled && logoUrl && isReward ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] text-white">
                      ★
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {slots > visibleSlots && (
            <div className="mt-1 text-[9px] font-semibold opacity-55">+{slots - visibleSlots} more stamps</div>
          )}

          <div className="mt-2 space-y-1">
            {(contactRows.length ? contactRows : [{ icon: 'ℹ', text: 'Add contact in Business Profile' }])
              .slice(0, 3)
              .map((row) => (
                <div key={row.text} className="flex items-start gap-1.5 text-[10px] font-semibold leading-tight">
                  <span className="w-3 shrink-0 opacity-70">{row.icon}</span>
                  <span className="min-w-0 truncate">{row.text}</span>
                </div>
              ))}
            {expiryLabel && (
              <div className="text-[9px] font-semibold opacity-55">Expires: {expiryLabel}</div>
            )}
          </div>
        </div>

        <div className="flex w-[100px] shrink-0 flex-col items-center border-l border-black/8 pl-3 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(qrTarget)}`}
            alt="QR"
            className="h-[84px] w-[84px] rounded-xl bg-white p-1.5 shadow-sm"
          />
          <div className="mt-2 text-center text-[9px] font-semibold leading-tight opacity-70">
            Scan to view offers
          </div>
          <div className="mt-auto hidden text-[8px] opacity-45 sm:block">{terms[0]}</div>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-white"
        style={{ background: stampColor }}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">
          f
        </span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">
          ⌕
        </span>
        <span className="truncate opacity-95">{social || '/yourbrand'}</span>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {doubleSided ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Loyalty card ${side} side. Click or swipe to flip.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              flip();
            }
          }}
          className="cursor-pointer touch-pan-y select-none outline-none transition-transform duration-200 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[var(--stampperk-coral)]/40"
        >
          {side === 'front' ? front : back}
        </div>
      ) : (
        front
      )}
      {doubleSided && (
        <p className="mt-2 text-center text-[11px] font-medium text-[#8E8E93]">
          Tap or swipe the card to see {side === 'front' ? 'back' : 'front'} · Contact details from Business Profile
        </p>
      )}
    </div>
  );
}
