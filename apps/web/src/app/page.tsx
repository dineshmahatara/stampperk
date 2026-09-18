'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaqList } from '@/components/FaqList';
import { MarketingHeader } from '@/components/MarketingHeader';
import { PricingTable } from '@/components/PricingTable';
import { BrandMark } from '@/components/BrandMark';
import { useBranding } from '@/components/BrandingProvider';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type Feature = { title: string; body: string };
type Review = { country: string; quote: string };

function FeatureIcon({ index }: { index: number }) {
  const common = 'h-5 w-5';
  switch (index) {
    case 0:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );
    case 1:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
        </svg>
      );
    case 2:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z" />
        </svg>
      );
    case 3:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 11a4 4 0 10-8 0v1H6v8h12v-8h-2v-1z" />
          <path d="M9 15h6" />
        </svg>
      );
    case 4:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16v10H7l-3 3V7z" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" />
        </svg>
      );
  }
}

function HeroVisual({ company }: { company: string }) {
  return (
    <div className="relative mx-auto w-full max-w-xl fade-up-delay">
      <div
        className="pointer-events-none absolute -inset-10 rounded-full opacity-80 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 45% 40%, rgba(255,90,95,0.45), transparent 62%)',
        }}
      />
      {/* Full-bleed product plane — stamp card as the product */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/30 bg-[#141418] shadow-[0_40px_90px_rgba(20,16,18,0.45)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(135deg, transparent 40%, rgba(255,90,95,0.35) 100%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12), transparent 45%)',
          }}
        />
        <div className="relative p-6 sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p
                className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
                style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
              >
                {company}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/55">Digital stamp card</p>
            </div>
            <VerifiedBadge size="lg" />
          </div>

          <div className="rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold text-white">Brew &amp; Bliss</p>
                <p className="text-xs font-semibold text-white/50">Free drink · 10 stamps</p>
              </div>
              <p className="stamp-count text-sm font-black text-[#FF8A8E]">4 / 10</p>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`stamp-dot aspect-square rounded-full border-2 ${
                    i < 4
                      ? 'border-[#FF5A5F] bg-[#FF5A5F] shadow-[0_0_12px_rgba(255,90,95,0.55)]'
                      : 'border-white/25 bg-white/5'
                  }`}
                  style={i < 4 ? { animationDelay: `${i * 0.12}s` } : undefined}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
            <span>QR stamp</span>
            <span>Discover</span>
            <span>Automations</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const branding = useBranding();
  const companyName = branding.companyName || 'Stamp Perk';
  const steps = t('steps', { returnObjects: true }) as string[];
  const features = t('features', { returnObjects: true }) as Feature[];
  const reviews = t('reviews', { returnObjects: true }) as Review[];
  const heroBefore = t('heroTitleBefore');

  return (
    <main className="landing-shell" key={i18n.language}>
      <MarketingHeader />

      {/* Hero — one composition, brand-first, full-bleed product visual */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,90,95,0.12) 0%, transparent 42%), radial-gradient(ellipse 90% 70% at 85% 20%, rgba(255,90,95,0.18), transparent 55%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(28,25,23,0.14) 1px, transparent 0)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 75% 55% at 40% 15%, black 15%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:gap-14 md:px-6 md:pb-24 md:pt-10">
          <div className="fade-up">
            <p
              className="mb-4 text-4xl font-extrabold tracking-tight text-[var(--stampperk-ink)] sm:text-5xl md:text-[3.25rem]"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {companyName}
            </p>
            <h1 className="mb-5 max-w-xl text-3xl font-extrabold leading-[1.12] tracking-tight text-[var(--stampperk-ink)] md:text-4xl lg:text-[2.65rem]">
              {heroBefore ? (
                <>
                  {heroBefore}{' '}
                  <span className="hero-underline text-[var(--stampperk-coral)]">{t('heroTitleAccent')}</span>
                </>
              ) : (
                <span className="hero-underline text-[var(--stampperk-coral)]">{t('heroTitleAccent')}</span>
              )}
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-[var(--stampperk-muted)]">{t('heroBody')}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                {t('startHere')} →
              </Link>
              <a
                href="#how"
                className="btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('seeHow')}
              </a>
            </div>
            <p className="mt-6 text-sm font-semibold text-[var(--stampperk-muted)]">
              <span className="text-[var(--stampperk-coral)]">✓</span> {t('noCard')}
              <span className="mx-2 text-[var(--stampperk-line)]">·</span>
              {t('mobileDesktop')}
              <span className="mx-2 text-[var(--stampperk-line)]">·</span>
              {t('easySetup')}
            </p>
          </div>
          <HeroVisual company={companyName} />
        </div>
      </section>

      {/* Audience — one job each */}
      <section className="mx-auto max-w-6xl px-5 py-8 md:px-6 md:py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="reveal-on-scroll rounded-[1.75rem] border border-[var(--stampperk-line)] bg-[var(--stampperk-surface)]/90 p-7 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--stampperk-coral)]">Merchants</p>
            <h2
              className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {t('audienceMerchantsTitle')}
            </h2>
            <p className="mt-3 text-[var(--stampperk-muted)]">{t('audienceMerchantsBody')}</p>
            <Link href="/register" className="btn-primary mt-6 !text-sm">
              {t('audienceMerchantsCta')} →
            </Link>
          </div>
          <div className="reveal-on-scroll reveal-delay rounded-[1.75rem] bg-[#141418] p-7 text-white md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF8A8E]">Customers</p>
            <h2
              className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {t('audienceCustomersTitle')}
            </h2>
            <p className="mt-3 text-white/70">{t('audienceCustomersBody')}</p>
            <Link
              href="/discover"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[#141418] transition hover:-translate-y-0.5"
            >
              {t('audienceCustomersCta')} →
            </Link>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-14 md:px-6 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--stampperk-coral)]">{t('howLabel')}</p>
          <h2
            className="text-3xl font-extrabold tracking-tight md:text-5xl"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('howTitle')}
          </h2>
          <p className="mt-3 text-lg text-[var(--stampperk-muted)]">{t('howBody')}</p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[1.75rem] border border-[var(--stampperk-line)] bg-[var(--stampperk-line)] sm:grid-cols-2 lg:grid-cols-4">
          {(Array.isArray(steps) ? steps : []).map((step, i) => (
            <li key={step} className="bg-[var(--stampperk-surface)] p-5 md:p-6">
              <div className="mb-3 text-sm font-black text-[var(--stampperk-coral)]">0{i + 1}</div>
              <div className="text-lg font-bold leading-snug">{step}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* Product */}
      <section id="product" className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--stampperk-coral)]">
            {t('resourcesLabel')}
          </p>
          <h2
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('resourcesTitle')}
          </h2>
          <p className="mt-3 text-lg text-[var(--stampperk-muted)]">{t('resourcesBody')}</p>
        </div>
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {(Array.isArray(features) ? features : []).map((f, i) => (
            <div key={f.title} className="reveal-on-scroll border-t border-[var(--stampperk-line)] pt-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--stampperk-pink)] text-[var(--stampperk-coral)]">
                <FeatureIcon index={i} />
              </div>
              <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--stampperk-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verified */}
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#141418] px-7 py-10 text-white md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(255,90,95,0.35), transparent 55%)',
            }}
          />
          <div className="relative max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2">
              <VerifiedBadge size="md" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF8A8E]">{t('verifiedLabel')}</p>
            </div>
            <h2
              className="text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {t('verifiedTitle')}
            </h2>
            <p className="mt-3 text-white/70">{t('verifiedBody')}</p>
            <Link
              href="/pricing"
              className="mt-7 inline-flex rounded-full bg-[#FF5A5F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              {t('verifiedCta')} →
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 md:px-6 md:py-20">
        <PricingTable compact />
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto mb-8 max-w-6xl px-5 md:px-6">
          <h2
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('reviewsTitle')}
          </h2>
        </div>
        <div className="marquee">
          <div className="marquee-track px-4">
            {[
              ...(Array.isArray(reviews) ? reviews : []),
              ...(Array.isArray(reviews) ? reviews : []),
            ].map((r, i) => (
              <article
                key={`${r.country}-${i}`}
                className="w-[300px] shrink-0 border-l-2 border-[var(--stampperk-coral)] bg-[var(--stampperk-surface)]/80 px-5 py-4"
              >
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--stampperk-coral)]">
                  {r.country}
                </div>
                <p className="text-sm leading-relaxed text-[var(--stampperk-ink)]">“{r.quote}”</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-16 md:px-6 md:py-20">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[var(--stampperk-coral)]">{t('faqLabel')}</p>
          <h2
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('faqTitle')}
          </h2>
        </div>
        <FaqList />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FF5A5F] via-[#ef4a58] to-[#ff7a85] px-8 py-12 text-white md:px-14 md:py-16">
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
          <h2
            className="relative max-w-xl text-3xl font-extrabold tracking-tight md:text-5xl"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {t('ctaTitle')}
          </h2>
          <p className="relative mt-3 max-w-lg text-lg text-white/90">{t('ctaBody')}</p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-bold shadow-lg transition hover:-translate-y-0.5"
              style={{ color: 'var(--stampperk-coral-dark)' }}
            >
              {t('startCreating')} →
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center rounded-full border border-white/45 px-6 py-3.5 text-base font-bold text-white"
            >
              {t('discover')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--stampperk-line)] bg-[var(--stampperk-surface)]/80 px-5 py-10 text-sm text-[var(--stampperk-muted)] md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandMark href="/" />
            <p className="mt-3 max-w-xs">{t('footerTag')}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/pricing">{t('pricing')}</Link>
            <Link href="/discover">{t('discover')}</Link>
            <Link href="/privacy">{t('privacy')}</Link>
            <Link href="/terms">{t('terms')}</Link>
            <Link href="/login">{t('businessLogin')}</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl">
          © {new Date().getFullYear()} {companyName}
        </div>
      </footer>
    </main>
  );
}
