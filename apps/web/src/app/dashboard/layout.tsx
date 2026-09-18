'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PLAN_LIMITS } from '@stampperk/shared';
import { useAuth } from '@/lib/auth';
import { api, getActiveMerchantId, setActiveMerchantId } from '@/lib/api';
import { PanelShell } from '@/components/PanelShell';
import { MerchantShell, MerchantNavGroup, BusinessOption } from '@/components/MerchantShell';

const OWNER_ONLY = [
  '/dashboard/cards',
  '/dashboard/billing',
  '/dashboard/staff',
  '/dashboard/onboarding',
  '/dashboard/branches',
  '/dashboard/rewards',
  '/dashboard/customers',
  '/dashboard/analytics',
  '/dashboard/reports',
  '/dashboard/export',
  '/dashboard/leaflets',
  '/dashboard/automations',
  '/dashboard/coupons',
];

const MERCHANT_AREA = [
  ...OWNER_ONLY,
  '/dashboard/campaigns',
  '/dashboard/scan',
  '/dashboard/profile',
  '/dashboard/stamps',
  '/dashboard/redemptions',
  '/dashboard/announcements',
  '/dashboard/notifications',
];

type MerchantMeta = {
  id?: string;
  businessName?: string;
  city?: string | null;
  country?: string;
  slug?: string;
  logoUrl?: string | null;
  subscription?: { plan?: string } | null;
};

type ListedMerchant = MerchantMeta & {
  id: string;
  businessName: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { token, user, loading, logout, experience, setAppMode, appMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [merchant, setMerchant] = useState<MerchantMeta | null>(null);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isMerchantRole = user?.role === 'MERCHANT_OWNER' || user?.role === 'STAFF';
  const inCustomerExperience = experience === 'customer';
  const inMerchantExperience = experience === 'merchant';

  const loadBusinesses = useCallback(async () => {
    if (!token || !isMerchantRole || !inMerchantExperience) return;
    try {
      const list = await api<ListedMerchant[]>('/merchants/mine', { token, merchantId: null });
      const opts: BusinessOption[] = list.map((m) => ({
        id: m.id,
        businessName: m.businessName,
        city: m.city,
        plan: m.subscription?.plan,
        logoUrl: m.logoUrl,
      }));
      setBusinesses(opts);

      let preferred = getActiveMerchantId();
      if (!preferred || !opts.some((o) => o.id === preferred)) {
        preferred = opts[0]?.id || null;
        setActiveMerchantId(preferred);
      }
      setActiveId(preferred);

      if (preferred) {
        const m = await api<MerchantMeta>('/merchants/me', { token, merchantId: preferred });
        setMerchant({
          id: m.id,
          businessName: m.businessName,
          city: m.city,
          country: m.country,
          slug: m.slug,
          logoUrl: m.logoUrl,
          subscription: m.subscription,
        });
        if (m.id && m.id !== preferred) {
          setActiveMerchantId(m.id);
          setActiveId(m.id);
        }
      } else {
        setMerchant(null);
      }
    } catch {
      setMerchant(null);
      setBusinesses([]);
    }
  }, [token, isMerchantRole, inMerchantExperience]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses, reloadKey]);

  function switchBusiness(id: string) {
    setActiveMerchantId(id);
    setActiveId(id);
    setReloadKey((k) => k + 1);
  }

  const plan = (merchant?.subscription?.plan || businesses.find((b) => b.id === activeId)?.plan || 'FREE') as keyof typeof PLAN_LIMITS;
  const businessesLimit = PLAN_LIMITS[plan]?.businesses ?? 1;

  const customerLinks = useMemo(
    () => [
      { href: '/dashboard', label: 'Home' },
      { href: '/dashboard/discover', label: t('panel.nav.discover') },
      { href: '/dashboard/qr', label: t('panel.nav.myQr') },
      { href: '/dashboard/refer', label: 'Refer & Earn' },
      { href: '/dashboard/security', label: 'Security' },
      { href: '/dashboard/settings', label: 'Profile' },
    ],
    [t],
  );

  const merchantGroups = useMemo<MerchantNavGroup[]>(() => {
    if (user?.role === 'STAFF') {
      return [
        {
          title: 'Dashboard',
          items: [{ href: '/dashboard', label: 'Overview', icon: 'dashboard' }],
        },
        {
          title: 'Loyalty',
          items: [
            { href: '/dashboard/scan', label: 'Scan QR', icon: 'scan' },
            { href: '/dashboard/stamps', label: 'Stamp Transactions', icon: 'stamp' },
            { href: '/dashboard/redemptions', label: 'Redemptions', icon: 'gift' },
          ],
        },
        {
          title: 'Marketing',
          items: [
            { href: '/dashboard/campaigns', label: 'Promotions', icon: 'promo' },
            { href: '/dashboard/leaflets', label: 'Leaflets', icon: 'promo' },
          ],
        },
        {
          title: 'Business',
          items: [{ href: '/dashboard/profile', label: 'Business Profile', icon: 'store' }],
        },
      ];
    }

    return [
      {
        title: 'Dashboard',
        items: [{ href: '/dashboard', label: 'Overview', icon: 'dashboard' }],
      },
      {
        title: 'Loyalty',
        items: [
          { href: '/dashboard/cards', label: 'Loyalty Programs', icon: 'card' },
          { href: '/dashboard/stamps', label: 'Stamp Transactions', icon: 'stamp' },
          { href: '/dashboard/customers', label: 'Customers', icon: 'users' },
          { href: '/dashboard/rewards', label: 'Rewards', icon: 'gift' },
          { href: '/dashboard/redemptions', label: 'Redemptions', icon: 'gift' },
          { href: '/dashboard/scan', label: 'Scan QR', icon: 'scan' },
        ],
      },
      {
        title: 'Marketing',
        items: [
          { href: '/dashboard/campaigns', label: 'Promotions', icon: 'promo' },
          { href: '/dashboard/leaflets', label: 'Leaflets', icon: 'promo' },
          { href: '/dashboard/coupons', label: 'Coupons', icon: 'coupon' },
          { href: '/dashboard/automations', label: 'Automations', icon: 'megaphone' },
          { href: '/dashboard/announcements', label: 'Announcements', icon: 'megaphone' },
          { href: '/dashboard/notifications', label: 'Push Notifications', icon: 'bell' },
        ],
      },
      {
        title: 'Business',
        items: [
          { href: '/dashboard/branches', label: 'Branches', icon: 'branch' },
          { href: '/dashboard/staff', label: 'Staff Members', icon: 'staff' },
          { href: '/dashboard/profile', label: 'Business Profile', icon: 'store' },
          { href: '/dashboard/billing', label: 'Billing', icon: 'billing' },
        ],
      },
      {
        title: 'Reports',
        items: [
          { href: '/dashboard/analytics', label: 'Analytics', icon: 'chart' },
          { href: '/dashboard/reports', label: 'Reports', icon: 'chart' },
          { href: '/dashboard/export', label: 'Export Data', icon: 'export' },
        ],
      },
    ];
  }, [user?.role]);

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [loading, token, router]);

  useEffect(() => {
    if (!user || loading) return;
    if (user.role === 'SUPER_ADMIN') {
      router.replace('/admin');
      return;
    }
    // Pure customers (and merchants in customer mode) cannot open merchant tools
    if (
      inCustomerExperience &&
      MERCHANT_AREA.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ) {
      router.replace('/dashboard');
      return;
    }
    if (
      inMerchantExperience &&
      user.role === 'STAFF' &&
      OWNER_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ) {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router, inCustomerExperience, inMerchantExperience]);

  if (loading || !token) {
    return <div className="p-8 text-[var(--stampperk-muted)]">{t('panel.loading')}</div>;
  }

  if (inCustomerExperience) {
    return (
      <PanelShell
        roleLabel={
          isMerchantRole
            ? `Customer mode · ${user?.role?.replace(/_/g, ' ')}`
            : user?.role?.replace(/_/g, ' ')
        }
        email={user?.email}
        userName={user?.name}
        photoUrl={user?.photoUrl}
        links={customerLinks}
        onLogout={logout}
      >
        {isMerchantRole && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="text-sm font-semibold text-[#5C5651]">
              You are browsing as a customer — collect stamps at other stores.
            </div>
            <button
              type="button"
              onClick={() => {
                setAppMode('business');
                router.push('/dashboard');
              }}
              className="rounded-full bg-[#FF5A5F] px-4 py-2 text-xs font-bold text-white"
            >
              Switch to Business mode
            </button>
          </div>
        )}
        {children}
      </PanelShell>
    );
  }

  if (inMerchantExperience) {
    return (
      <MerchantShell
        businessName={merchant?.businessName}
        city={merchant?.city}
        country={merchant?.country}
        slug={merchant?.slug}
        email={user?.email}
        businesses={businesses}
        activeBusinessId={activeId}
        onSwitchBusiness={switchBusiness}
        businessesLimit={businessesLimit}
        groups={merchantGroups}
        onLogout={logout}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold text-[#5C5651]">
            Also shop as a customer at other Stamp Perk businesses.
          </div>
          <button
            type="button"
            onClick={() => {
              setAppMode('customer');
              router.push('/dashboard');
            }}
            className="rounded-full border border-[var(--stampperk-coral)] px-4 py-2 text-xs font-bold text-[var(--stampperk-coral)]"
          >
            Switch to Customer mode
          </button>
        </div>
        <div key={`${pathname}-${activeId}-${reloadKey}`}>{children}</div>
      </MerchantShell>
    );
  }

  return (
    <PanelShell roleLabel={user?.role} email={user?.email} links={[]} onLogout={logout}>
      {children}
    </PanelShell>
  );
}
