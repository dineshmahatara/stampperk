'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { AdminShell, AdminNavGroup } from '@/components/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const groups = useMemo<AdminNavGroup[]>(
    () => [
      {
        title: 'Dashboard',
        items: [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }],
      },
      {
        title: 'Management',
        items: [
          { href: '/admin/merchants', label: 'Merchants', icon: 'store' },
          { href: '/admin/verifications', label: 'Verified Badge', icon: 'promo' },
          { href: '/admin/business-map', label: 'Business Map', icon: 'map' },
          { href: '/admin/users', label: 'Users', icon: 'users' },
          { href: '/admin/customers', label: 'Customers', icon: 'users' },
          { href: '/admin/staff', label: 'Staff', icon: 'staff' },
          { href: '/admin/subscriptions', label: 'Plans & Billing', icon: 'billing' },
          { href: '/admin/transactions', label: 'Transactions', icon: 'tx' },
        ],
      },
      {
        title: 'Loyalty & Rewards',
        items: [
          { href: '/admin/loyalty-programs', label: 'Loyalty Programs', icon: 'card' },
          { href: '/admin/rewards', label: 'Rewards', icon: 'gift' },
          { href: '/admin/redemptions', label: 'Redemptions', icon: 'gift' },
          { href: '/admin/promotions', label: 'Promotions', icon: 'promo' },
          { href: '/admin/leaflet-templates', label: 'Leaflet Templates', icon: 'promo' },
          { href: '/admin/stamp-transactions', label: 'Stamp Transactions', icon: 'stamp' },
        ],
      },
      {
        title: 'Analytics',
        items: [
          { href: '/admin/reports', label: 'Reports', icon: 'chart' },
          { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
          { href: '/admin/activity', label: 'Activity Logs', icon: 'activity' },
        ],
      },
      {
        title: 'System',
        items: [
          { href: '/admin/settings', label: 'Settings', icon: 'settings' },
          { href: '/admin/support', label: 'Support Tickets', icon: 'support' },
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [loading, token, router]);

  useEffect(() => {
    if (!loading && user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || !token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] text-[#8E8E93]">
        Loading admin…
      </div>
    );
  }

  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] text-[#8E8E93]">
        Redirecting…
      </div>
    );
  }

  return (
    <AdminShell
      token={token}
      email={user.email}
      name={user.name}
      photoUrl={user.photoUrl}
      groups={groups}
      onLogout={logout}
    >
      <div key={pathname}>{children}</div>
    </AdminShell>
  );
}
