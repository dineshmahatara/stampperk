import Link from 'next/link';
import { Suspense } from 'react';
import { API_URL } from '@/lib/api';
import { EnrollButton } from '@/components/EnrollButton';
import { PublicStampCard } from '@/components/PublicStampCard';
import { MapsNavigateLink } from '@/components/MapsNavigateLink';
import { ReferralCapture } from '@/components/ReferralCapture';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatLocationParts, googleMapsNavigateUrl, appleMapsNavigateUrl } from '@/lib/geo';
import { fetchBranding } from '@/lib/branding';

type Program = {
  id: string;
  title: string;
  totalStamps: number;
  rewardTitle: string;
  rewardDescription?: string | null;
  cardType?: string | null;
  logoUrl?: string | null;
  logoScale?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  logoPosX?: number | null;
  logoPosY?: number | null;
  promoImageUrl?: string | null;
  businessName?: string | null;
  stampColor?: string | null;
  emptyStampColor?: string | null;
  accentColor?: string | null;
  fontStyle?: string | null;
  categorySlug?: string | null;
  doubleSided?: boolean;
};

type Campaign = {
  id: string;
  title: string;
  badgeText: string;
  description: string;
  imageUrl?: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
};
type GalleryPhoto = { id: string; url: string };
type PublicLink = { id: string; label: string; url: string };
type Branch = {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Business = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  description?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  currency?: string;
  timezone?: string;
  hoursJson?: Record<string, string> | null;
  deliveryEnabled?: boolean;
  deliveryNote?: string | null;
  supportNote?: string | null;
  yearEstablished?: number | null;
  businessType?: string | null;
  contactPerson?: string | null;
  designation?: string | null;
  loyaltyPrograms?: Program[];
  campaigns?: Campaign[];
  menuItems?: MenuItem[];
  gallery?: GalleryPhoto[];
  publicLinks?: PublicLink[];
  branches?: Branch[];
  verified?: boolean;
};

async function getBusiness(slug: string): Promise<Business | null> {
  const res = await fetch(`${API_URL}/api/merchants/public/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function host(url?: string | null) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function socialHref(raw?: string | null) {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `https://${raw}`;
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [business, branding] = await Promise.all([getBusiness(slug), fetchBranding()]);
  const companyName = branding.companyName || 'Stampz';

  if (!business) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF5A5F]">{companyName}</p>
        <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight">
          Business not found
        </h1>
        <Link href="/" className="mt-6 rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white">
          Back home
        </Link>
      </main>
    );
  }

  const location = formatLocationParts(business.address, business.city, business.district);
  const mapsTarget = {
    latitude: business.latitude,
    longitude: business.longitude,
    address: location || undefined,
    label: business.businessName,
    googleMapsUrl: business.googleMapsUrl,
  };
  const googleNav = googleMapsNavigateUrl(mapsTarget);
  const appleNav = appleMapsNavigateUrl(mapsTarget);
  const phone = business.phone || business.mobile;
  const hours =
    business.hoursJson && typeof business.hoursJson === 'object'
      ? Object.entries(business.hoursJson as Record<string, string>)
      : [];
  const socials = [
    { label: 'Facebook', href: socialHref(business.facebook) },
    { label: 'Instagram', href: socialHref(business.instagram) },
    { label: 'TikTok', href: socialHref(business.tiktok) },
    { label: 'LinkedIn', href: socialHref(business.linkedin) },
    { label: 'YouTube', href: socialHref(business.youtube) },
    { label: 'X', href: socialHref(business.twitter) },
  ].filter((s) => s.href);
  const programs = business.loyaltyPrograms || [];
  const firstProgram = programs[0];
  const gallery = business.gallery || [];
  const menu = business.menuItems || [];
  const offers = business.campaigns || [];
  const links = business.publicLinks || [];
  const accent = firstProgram?.stampColor || '#16352A';
  const cream = firstProgram?.accentColor || '#F3EEE4';

  return (
    <main className="min-h-screen bg-[#F7F3EE] text-[#1C1C1E]">
      <Suspense fallback={null}>
        <ReferralCapture merchantId={business.id} merchantSlug={business.slug} />
      </Suspense>
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="text-sm font-extrabold tracking-tight text-white/90 drop-shadow">
          {companyName}
        </Link>
        <Link
          href="/discover"
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25"
        >
          Discover
        </Link>
      </header>

      {/* Hero — full bleed brand plane */}
      <section
        className="relative overflow-hidden px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28"
        style={{
          background: `
            radial-gradient(ellipse at 15% 20%, rgba(255,255,255,0.12), transparent 45%),
            radial-gradient(ellipse at 85% 80%, rgba(0,0,0,0.25), transparent 50%),
            linear-gradient(145deg, ${accent} 0%, #0f241c 55%, #1a1a1a 100%)
          `,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg backdrop-blur sm:h-24 sm:w-24">
              {business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-[#C9B08A]">
                  {business.businessName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C9B08A]">
              {[business.category, business.city].filter(Boolean).join(' · ')}
            </p>
            <h1 className="mt-3 inline-flex flex-wrap items-center gap-2 font-[family-name:var(--font-fraunces)] text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {business.businessName}
              {business.verified ? <VerifiedBadge size="lg" /> : null}
            </h1>
            {business.verified ? (
              <p className="mt-2 text-sm font-semibold text-[#C9B08A]">Stampz Verified business</p>
            ) : null}
            <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
              {business.tagline || business.description || 'Collect stamps. Unlock rewards. Come back for more.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {firstProgram ? (
                <a
                  href={`#loyalty-${firstProgram.id}`}
                  className="rounded-full px-5 py-3 text-sm font-extrabold shadow-lg transition hover:brightness-110"
                  style={{ background: '#C9B08A', color: accent }}
                >
                  Join loyalty card
                </a>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#1C1C1E]"
                >
                  Sign in to join
                </Link>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Call {phone}
                </a>
              )}
            </div>
          </div>

          {(business.yearEstablished || business.deliveryEnabled || business.businessType) && (
            <div className="flex flex-wrap gap-6 text-white/70 sm:gap-8">
              {business.yearEstablished && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9B08A]">Est.</div>
                  <div className="text-2xl font-extrabold text-white">{business.yearEstablished}</div>
                </div>
              )}
              {business.businessType && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9B08A]">Type</div>
                  <div className="max-w-[10rem] text-sm font-bold text-white">{business.businessType}</div>
                </div>
              )}
              {business.deliveryEnabled && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9B08A]">Delivery</div>
                  <div className="text-sm font-bold text-white">Available</div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-8 max-w-5xl space-y-10 px-5 pb-20 sm:px-8">
        {/* Contact strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-[1.5rem] border border-black/5 bg-white px-5 py-4 text-sm shadow-[0_12px_40px_rgba(22,53,42,0.08)]">
          {location && (
            <MapsNavigateLink
              target={mapsTarget}
              className="font-semibold text-[#5C5651] hover:text-[#FF5A5F]"
            >
              ⌖ {location}
            </MapsNavigateLink>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`} className="font-semibold text-[#5C5651] hover:text-[#FF5A5F]">
              ✉ {business.email}
            </a>
          )}
          {business.website && (
            <a
              href={socialHref(business.website) || '#'}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#5C5651] hover:text-[#FF5A5F]"
            >
              ↗ {host(business.website)}
            </a>
          )}
          {business.whatsapp && (
            <a
              href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#5C5651] hover:text-[#FF5A5F]"
            >
              WhatsApp
            </a>
          )}
          {googleNav && (
            <a href={googleNav} target="_blank" rel="noreferrer" className="font-semibold text-[#FF5A5F]">
              Google Maps →
            </a>
          )}
          {appleNav && (
            <a href={appleNav} target="_blank" rel="noreferrer" className="font-semibold text-[#FF5A5F]">
              Apple Maps →
            </a>
          )}
        </div>

        {/* Hours */}
        {hours.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">
              Business hours
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {hours.map(([day, time]) => (
                <div
                  key={day}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm"
                >
                  <span className="font-bold capitalize text-[#5C5651]">{day}</span>
                  <span className="font-semibold text-[#1C1C1E]">{time}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {(business.description || business.contactPerson || business.supportNote) && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">About</h2>
            {business.description && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#5C5651]">{business.description}</p>
            )}
            {(business.contactPerson || business.supportNote || business.deliveryNote) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {business.contactPerson && (
                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Contact</div>
                    <div className="font-bold">
                      {business.contactPerson}
                      {business.designation ? ` · ${business.designation}` : ''}
                    </div>
                  </div>
                )}
                {business.deliveryNote && (
                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Delivery</div>
                    <div className="text-sm font-semibold text-[#5C5651]">{business.deliveryNote}</div>
                  </div>
                )}
                {business.supportNote && (
                  <div className="rounded-2xl bg-white/80 px-4 py-3 sm:col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Support</div>
                    <div className="text-sm font-semibold text-[#5C5651]">{business.supportNote}</div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Loyalty */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">
                Loyalty cards
              </h2>
              <p className="mt-1 text-sm text-[#5C5651]">Collect stamps and unlock rewards from this business.</p>
            </div>
          </div>
          {programs.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {programs.map((p) => (
                <div key={p.id} id={`loyalty-${p.id}`} className="scroll-mt-24">
                  <PublicStampCard
                    businessName={p.businessName || business.businessName}
                    categorySlug={p.categorySlug || undefined}
                    categoryLabel={business.category}
                    logoUrl={p.logoUrl || business.logoUrl || undefined}
                    promoImageUrl={p.promoImageUrl || undefined}
                    logoScale={p.logoScale ?? 1}
                    logoOffsetX={p.logoOffsetX ?? 0}
                    logoOffsetY={p.logoOffsetY ?? 0}
                    logoPosX={p.logoPosX ?? 50}
                    logoPosY={p.logoPosY ?? 32}
                    tagline={business.tagline || undefined}
                    totalStamps={p.totalStamps}
                    rewardTitle={p.rewardTitle}
                    stampColor={p.stampColor || accent}
                    emptyStampColor={p.emptyStampColor || undefined}
                    accentColor={p.accentColor || cream}
                    fontStyle={p.fontStyle || undefined}
                    profile={{
                      phone: business.phone,
                      email: business.email,
                      website: business.website,
                      address: business.address,
                      city: business.city,
                      facebook: business.facebook,
                      instagram: business.instagram,
                      tiktok: business.tiktok,
                      deliveryEnabled: business.deliveryEnabled,
                      tagline: business.tagline,
                      slug: business.slug,
                      contactPerson: business.contactPerson,
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-extrabold">{p.title}</div>
                      <div className="text-xs text-[#8E8E93]">
                        {p.cardType?.replace('_', ' ') || 'CLASSIC'} · {p.totalStamps} stamps → {p.rewardTitle}
                      </div>
                    </div>
                    <EnrollButton programId={p.id} title={p.title} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/10 bg-white/50 px-4 py-8 text-center text-sm text-[#8E8E93]">
              No loyalty cards yet.
            </p>
          )}
        </section>

        {/* Offers */}
        <section>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">Offers</h2>
          <p className="mt-1 text-sm text-[#5C5651]">Current promotions from {business.businessName}.</p>
          {offers.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {offers.map((c) => (
                <article
                  key={c.id}
                  className="relative overflow-hidden rounded-[1.25rem] border border-black/5 bg-white p-5 shadow-sm"
                >
                  <span className="inline-block rounded-full bg-[#FF5A5F] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                    {c.badgeText}
                  </span>
                  <h3 className="mt-3 text-lg font-extrabold tracking-tight">{c.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#5C5651]">{c.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#8E8E93]">No active offers right now.</p>
          )}
        </section>

        {/* Gallery */}
        {gallery.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">Gallery</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {gallery.map((g, i) => (
                <div
                  key={g.id}
                  className={`overflow-hidden rounded-2xl bg-[#E8E2DA] ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.url}
                    alt=""
                    className={`w-full object-cover ${i === 0 ? 'h-full min-h-[220px]' : 'aspect-square'}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu */}
        {menu.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">
              Product menu
            </h2>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              {menu.map((m) => (
                <article
                  key={m.id}
                  className="w-40 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                >
                  <div className="flex h-28 items-center justify-center bg-[#FFF0F1]">
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-[#FF5A5F]">{m.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate font-extrabold">{m.name}</div>
                    {m.price != null && (
                      <div className="mt-0.5 text-sm font-bold text-[#FF5A5F]">
                        {business.currency || 'NPR'} {m.price}
                      </div>
                    )}
                    {m.description && (
                      <div className="mt-0.5 truncate text-xs text-[#8E8E93]">{m.description}</div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        {links.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">Links</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold hover:border-[#FF5A5F] hover:text-[#FF5A5F]"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Branches */}
        {(business.branches?.length || 0) > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">Locations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {business.branches!.map((b) => {
                const branchTarget = {
                  latitude: b.latitude,
                  longitude: b.longitude,
                  address: b.address || undefined,
                  label: b.name,
                };
                return (
                  <div key={b.id} className="rounded-2xl border border-black/5 bg-white px-4 py-3">
                    <div className="font-extrabold">{b.name}</div>
                    {b.address && (
                      <MapsNavigateLink
                        target={branchTarget}
                        className="mt-0.5 block text-sm text-[#5C5651] hover:text-[#FF5A5F]"
                      >
                        ⌖ {b.address}
                      </MapsNavigateLink>
                    )}
                    {(b.latitude != null && b.longitude != null) && (
                      <MapsNavigateLink
                        target={branchTarget}
                        className="mt-2 inline-block text-xs font-bold text-[#FF5A5F]"
                      >
                        Navigate →
                      </MapsNavigateLink>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer brand bar */}
        <footer
          className="overflow-hidden rounded-[1.5rem] px-6 py-8 text-white"
          style={{ background: accent }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
                {business.businessName}
              </div>
              <p className="mt-1 text-sm text-white/70">
                {[business.city, business.country].filter(Boolean).join(', ') || `Powered by ${companyName}`}
              </p>
            </div>
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href!}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 text-xs text-white/55">
            <span>
              {business.currency || 'NPR'}
              {business.timezone ? ` · ${business.timezone}` : ''}
            </span>
            <Link href="/" className="font-bold text-[#C9B08A] hover:text-white">
              Powered by {companyName}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
