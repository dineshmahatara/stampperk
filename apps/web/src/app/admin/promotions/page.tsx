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
  AdminSuccess,
  AdminSectionTabs,
  AdminToolbar,
  AdminToolbarSearch,
  AdminSelect,
  AdminPagination,
  useAdminPagination,
  AdminSplit,
  AdminDonutCard,
  AdminRankList,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';
import { EntityAvatar } from '@/components/EntityAvatar';

type Promo = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  status: string;
  views: number;
  clicks: number;
  createdAt: string;
  merchant: { businessName: string; slug: string; logoUrl?: string | null };
};

type TabId = 'all' | 'ACTIVE' | 'DRAFT' | 'SCHEDULED' | 'ENDED';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10B981',
  DRAFT: '#F59E0B',
  SCHEDULED: '#38BDF8',
  ENDED: '#94A3B8',
};

export default function AdminPromotionsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Promo[]>([]);
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    if (!token) return;
    api<Promo[]>('/admin/promotions', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  async function setStatus(id: string, status: Promo['status']) {
    if (!token) return;
    setMenuId(null);
    await api(`/admin/promotions/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
    setMsg(`Updated to ${status}`);
    load();
  }

  const merchants = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.merchant.slug, r.merchant.businessName);
    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (merchantFilter !== 'ALL' && r.merchant.slug !== merchantFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.title} ${r.merchant.businessName} ${r.badgeText}`.toLowerCase().includes(s);
    });
  }, [rows, tab, q, merchantFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    tab,
    q,
    merchantFilter,
  ]);

  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 1000) / 10 : 0;
  const activeCount = rows.filter((r) => r.status === 'ACTIVE').length;
  const dates = rows.map((r) => r.createdAt);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ACTIVE: 0, DRAFT: 0, SCHEDULED: 0, ENDED: 0 };
    for (const r of rows) {
      if (counts[r.status] !== undefined) counts[r.status]++;
    }
    return counts;
  }, [rows]);

  const donutData = useMemo(
    () =>
      (['ACTIVE', 'DRAFT', 'SCHEDULED', 'ENDED'] as const)
        .filter((s) => statusCounts[s] > 0)
        .map((s) => ({
          name: s.charAt(0) + s.slice(1).toLowerCase(),
          value: statusCounts[s],
          color: STATUS_COLORS[s],
        })),
    [statusCounts],
  );

  const topByClicks = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          label: r.title,
          sub: r.merchant.businessName,
          value: num(r.clicks),
          imageUrl: r.merchant.logoUrl,
        })),
    [rows],
  );

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
    { id: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT },
    { id: 'SCHEDULED', label: 'Scheduled', count: statusCounts.SCHEDULED },
    { id: 'ENDED', label: 'Ended', count: statusCounts.ENDED },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Promotions"
        subtitle="Merchant campaigns and offers."
        action={<AdminDateRangePill />}
      />

      <AdminError message={error} />
      <AdminSuccess message={msg} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Campaigns"
          value={num(rows.length)}
          trend={trendFromDates(dates)}
          icon={ICONS.promo}
        />
        <AdminStatCard
          label="Active"
          value={num(activeCount)}
          trend={trendFromDates(rows.filter((r) => r.status === 'ACTIVE').map((r) => r.createdAt))}
          icon={ICONS.check}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <AdminStatCard
          label="Total views"
          value={num(totalViews)}
          icon={ICONS.activity}
          iconBg="bg-sky-50 text-sky-600"
        />
        <AdminStatCard
          label="Total clicks"
          value={num(totalClicks)}
          icon={ICONS.chart}
        />
        <AdminStatCard
          label="CTR"
          value={`${ctr}%`}
          icon={ICONS.ticket}
          iconBg="bg-violet-50 text-violet-600"
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
                  placeholder="Search campaigns, merchants…"
                />
                <AdminSelect value={merchantFilter} onChange={setMerchantFilter}>
                  <option value="ALL">All Merchants</option>
                  {merchants.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </AdminSelect>
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Badge</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Clicks</th>
                      <th className="px-4 py-3">CTR</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => {
                      const rowCtr =
                        p.views > 0 ? Math.round((p.clicks / p.views) * 1000) / 10 : 0;
                      return (
                        <tr key={p.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                          <td className="px-4 py-3">
                            <div className="font-bold">{p.title}</div>
                            <div className="mt-0.5 text-xs text-[#8E8E93]">{p.description}</div>
                            <div className="mt-0.5 text-[11px] text-[#AEAEB2]">
                              {fmtDate(p.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <EntityAvatar
                                src={p.merchant.logoUrl}
                                name={p.merchant.businessName}
                                size="sm"
                                rounded="xl"
                              />
                              <span className="font-semibold">{p.merchant.businessName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[#FFE8EA] px-2 py-0.5 text-xs font-bold text-[#FF5A5F]">
                              {p.badgeText}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">{num(p.views)}</td>
                          <td className="px-4 py-3 font-extrabold text-[#FF5A5F]">
                            {num(p.clicks)}
                          </td>
                          <td className="px-4 py-3 font-bold">{rowCtr}%</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="relative px-4 py-3 text-right">
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-lg font-bold text-[#8E8E93] hover:bg-black/5"
                              onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                              aria-label="Actions"
                            >
                              ⋯
                            </button>
                            {menuId === p.id && (
                              <div className="absolute right-4 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-black/8 bg-white py-1 text-left shadow-lg">
                                {(['ACTIVE', 'DRAFT', 'ENDED'] as const).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-xs font-bold hover:bg-[#FFF0F1]"
                                    onClick={() => setStatus(p.id, st)}
                                  >
                                    Set {st.charAt(0) + st.slice(1).toLowerCase()}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={8}>
                          <AdminEmpty message="No promotions found." />
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
              title="By Status"
              centerValue={rows.length}
              centerLabel="Campaigns"
              data={donutData.length ? donutData : [{ name: 'None', value: 1, color: '#E5E7EB' }]}
            />
            <AdminRankList
              title="Top by Clicks"
              items={topByClicks}
              empty="No click data yet."
            />
          </>
        }
      />
    </div>
  );
}
