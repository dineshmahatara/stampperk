'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminStatCard,
  AdminDateRangePill,
  AdminSectionTabs,
  AdminToolbar,
  AdminToolbarSearch,
  AdminSelect,
  AdminPagination,
  useAdminPagination,
  AdminSplit,
  AdminInsightCard,
  AdminDonutCard,
  AdminRankList,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
  fmtDate,
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type Customer = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  language?: string;
  currency?: string;
  createdAt: string;
  cardsCount: number;
  qrToken?: string;
};

type TabId = 'ALL' | 'WITH_CARDS' | 'NO_CARDS';

export default function AdminCustomersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [tab, setTab] = useState<TabId>('ALL');
  const [q, setQ] = useState('');
  const [langFilter, setLangFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<Customer[]>('/admin/customers', { token })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load customers'))
      .finally(() => setLoading(false));
  }, [token]);

  const languages = useMemo(() => {
    const langs = new Set(rows.map((r) => r.language).filter(Boolean) as string[]);
    return Array.from(langs).sort();
  }, [rows]);

  const withCards = rows.filter((r) => r.cardsCount > 0);
  const withoutCards = rows.filter((r) => r.cardsCount === 0);
  const totalCards = rows.reduce((s, r) => s + r.cardsCount, 0);
  const avgCards = rows.length ? Math.round((totalCards / rows.length) * 10) / 10 : 0;

  const tabCounts = {
    ALL: rows.length,
    WITH_CARDS: withCards.length,
    NO_CARDS: withoutCards.length,
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'WITH_CARDS' && r.cardsCount === 0) return false;
      if (tab === 'NO_CARDS' && r.cardsCount > 0) return false;
      if (langFilter !== 'ALL' && r.language !== langFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.name} ${r.email}`.toLowerCase().includes(s);
    });
  }, [rows, tab, q, langFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(
    filtered,
    [tab, q, langFilter],
  );

  const donutData = useMemo(
    () => [
      { name: 'With Cards', value: withCards.length, color: '#FF5A5F' },
      { name: 'No Cards', value: withoutCards.length, color: '#CBD5E1' },
    ],
    [withCards.length, withoutCards.length],
  );

  const topByCards = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.cardsCount - a.cardsCount)
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          label: c.name,
          sub: c.email,
          value: c.cardsCount,
          imageUrl: c.photoUrl,
        })),
    [rows],
  );

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: tabCounts.ALL },
    { id: 'WITH_CARDS', label: 'With Cards', count: tabCounts.WITH_CARDS },
    { id: 'NO_CARDS', label: 'No Cards', count: tabCounts.NO_CARDS },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Customers"
        subtitle="Loyalty customers across the platform."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminDateRangePill />
          </div>
        }
      />

      <AdminError message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Customers"
          value={loading && !rows.length ? '…' : num(rows.length)}
          trend={trendFromDates(rows.map((r) => r.createdAt))}
          icon={ICONS.users}
        />
        <AdminStatCard
          label="With Cards"
          value={num(withCards.length)}
          trend={trendFromDates(withCards.map((r) => r.createdAt))}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.stamp}
        />
        <AdminStatCard
          label="Without Cards"
          value={num(withoutCards.length)}
          trend={trendFromDates(withoutCards.map((r) => r.createdAt))}
          iconBg="bg-slate-50 text-slate-500"
          icon={ICONS.users}
        />
        <AdminStatCard
          label="Total Cards"
          value={num(totalCards)}
          iconBg="bg-[#FFF0F1] text-[#FF5A5F]"
          icon={ICONS.gift}
        />
        <AdminStatCard
          label="Avg Cards"
          value={String(avgCards)}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.chart}
        />
      </div>

      <AdminSplit
        main={
          <AdminSurface className="!p-0 overflow-hidden">
            <AdminSectionTabs tabs={tabs} value={tab} onChange={setTab} />
            <div className="p-4">
              <AdminToolbar>
                <AdminToolbarSearch
                  value={q}
                  onChange={setQ}
                  placeholder="Search name or email…"
                />
                <AdminSelect value={langFilter} onChange={setLangFilter}>
                  <option value="ALL">All Languages</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </AdminSelect>
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Cards</th>
                      <th className="px-4 py-3">Locale</th>
                      <th className="px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c) => (
                      <tr key={c.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar src={c.photoUrl} name={c.name} size="md" rounded="full" />
                            <div className="min-w-0">
                              <div className="font-bold">{c.name}</div>
                              <div className="truncate text-xs text-[#8E8E93]">{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-[#FF5A5F]">{c.cardsCount}</td>
                        <td className="px-4 py-3 text-[#8E8E93]">
                          {c.language || '—'} / {c.currency || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(c.createdAt)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={4}>
                          <AdminEmpty message="No customers found." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </AdminSurface>
        }
        side={
          <>
            <AdminDonutCard
              title="Card Adoption"
              centerValue={rows.length}
              centerLabel="Customers"
              data={donutData}
            />
            <AdminRankList
              title="Top by Cards"
              items={topByCards}
              empty="No card data yet."
            />
            <AdminInsightCard
              title="Engagement"
              message={
                withoutCards.length > 0
                  ? `${withoutCards.length} customers have no loyalty cards yet. Consider outreach or onboarding campaigns.`
                  : 'All customers have at least one loyalty card — great engagement!'
              }
              href="/admin/analytics"
              hrefLabel="View Analytics"
            />
          </>
        }
      />
    </div>
  );
}
