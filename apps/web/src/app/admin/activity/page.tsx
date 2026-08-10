'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
  StatusBadge,
  fmtDate,
} from '@/components/AdminPage';
import {
  AdminStatCard,
  AdminDateRangePill,
  AdminSectionTabs,
  AdminToolbar,
  AdminToolbarSearch,
  AdminPagination,
  useAdminPagination,
  AdminSplit,
  AdminDonutCard,
  AdminRankList,
  AdminInsightCard,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';

type Item = {
  id: string;
  type: string;
  title: string;
  detail: string;
  at: string;
};

type TabId = 'ALL' | 'stamp' | 'redeem' | 'merchant' | 'audit';

const TYPE_COLORS: Record<string, string> = {
  stamp: '#FF5A5F',
  redeem: '#8B5CF6',
  merchant: '#38BDF8',
  audit: '#F59E0B',
};

export default function AdminActivityPage() {
  const { token } = useAuth();
  const [feed, setFeed] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<TabId>('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<{ feed: Item[] }>('/admin/activity', { token })
      .then((r) => setFeed(r.feed || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [token]);

  const counts = useMemo(
    () => ({
      all: feed.length,
      stamp: feed.filter((f) => f.type === 'stamp').length,
      redeem: feed.filter((f) => f.type === 'redeem').length,
      merchant: feed.filter((f) => f.type === 'merchant').length,
      audit: feed.filter((f) => f.type === 'audit').length,
    }),
    [feed],
  );

  const filtered = useMemo(() => {
    return feed.filter((r) => {
      if (tab !== 'ALL' && r.type !== tab) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.title} ${r.detail} ${r.type}`.toLowerCase().includes(s);
    });
  }, [feed, q, tab]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    q,
    tab,
  ]);

  const datesByType = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const item of feed) {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item.at);
    }
    return map;
  }, [feed]);

  const donutData = useMemo(
    () =>
      (['stamp', 'redeem', 'merchant', 'audit'] as const)
        .map((t) => ({
          name: t.charAt(0).toUpperCase() + t.slice(1),
          value: counts[t],
          color: TYPE_COLORS[t],
        }))
        .filter((d) => d.value > 0),
    [counts],
  );

  const highSignal = useMemo(
    () =>
      feed
        .filter((f) => f.type === 'audit' || f.type === 'merchant')
        .slice(0, 6)
        .map((f) => ({
          id: f.id,
          label: f.title,
          sub: f.detail,
          value: f.type,
        })),
    [feed],
  );

  const insight = useMemo(() => {
    const recentStamps = counts.stamp;
    const recentRedeems = counts.redeem;
    if (recentStamps === 0 && recentRedeems === 0) {
      return 'No stamp or redeem events recorded yet. Activity will appear here as merchants go live.';
    }
    const ratio = recentRedeems / Math.max(recentStamps, 1);
    if (ratio > 0.3) {
      return `Strong redemption rate (${Math.round(ratio * 100)}% of stamp events). Customers are actively using rewards.`;
    }
    return `${num(recentStamps)} stamp events vs ${num(recentRedeems)} redemptions in the feed. Monitor merchant onboarding for more activity.`;
  }, [counts]);

  function exportCsv() {
    const header = ['Type', 'Title', 'Detail', 'When'];
    const lines = filtered.map((r) =>
      [r.type, r.title, r.detail, r.at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-feed.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.all },
    { id: 'stamp', label: 'Stamps', count: counts.stamp },
    { id: 'redeem', label: 'Redeems', count: counts.redeem },
    { id: 'merchant', label: 'Merchants', count: counts.merchant },
    { id: 'audit', label: 'Audits', count: counts.audit },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Activity Logs"
        subtitle="Live audit trail across the platform."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-bold"
            >
              Export CSV
            </button>
            <AdminDateRangePill />
          </div>
        }
      />

      <AdminError message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Events"
          value={loading ? '…' : num(filtered.length)}
          trend={trendFromDates(feed.map((f) => f.at))}
          icon={ICONS.activity}
        />
        <AdminStatCard
          label="Stamps"
          value={num(counts.stamp)}
          trend={trendFromDates(datesByType.stamp || [])}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.stamp}
        />
        <AdminStatCard
          label="Redeems"
          value={num(counts.redeem)}
          trend={trendFromDates(datesByType.redeem || [])}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.gift}
        />
        <AdminStatCard
          label="Merchants"
          value={num(counts.merchant)}
          trend={trendFromDates(datesByType.merchant || [])}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Audits"
          value={num(counts.audit)}
          trend={trendFromDates(datesByType.audit || [])}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.alert}
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
                  placeholder="Search title, detail, type…"
                />
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((a) => (
                      <tr key={`${a.type}-${a.id}`} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-2.5">
                          <StatusBadge status={a.type.toUpperCase()} />
                        </td>
                        <td className="px-4 py-2.5 font-bold">{a.title}</td>
                        <td className="max-w-xs truncate px-4 py-2.5 text-[#636366]">{a.detail}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#8E8E93]">{fmtDate(a.at)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={4}>
                          <AdminEmpty message="No activity matches these filters." />
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
              title="Events by type"
              centerValue={num(feed.length)}
              centerLabel="Total"
              data={donutData}
            />
            <AdminRankList
              title="Recent high-signal"
              items={highSignal}
              empty="No audit or merchant events yet."
            />
            <AdminInsightCard
              title="Activity insight"
              message={insight}
              href="/admin/analytics"
              hrefLabel="View analytics"
            />
          </>
        }
      />
    </div>
  );
}
