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

type Reward = {
  id: string;
  rewardTitle: string;
  rewardDescription?: string | null;
  totalStamps: number;
  active: boolean;
  programTitle: string;
  merchant: { businessName: string; slug: string; logoUrl?: string | null };
  cardsCount: number;
  redemptionsCount: number;
  createdAt: string;
};

type TabId = 'all' | 'active' | 'inactive';

export default function AdminRewardsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Reward[]>([]);
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Reward[]>('/admin/rewards', { token })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [token]);

  const merchants = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.merchant.slug, r.merchant.businessName);
    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'active' && !r.active) return false;
      if (tab === 'inactive' && r.active) return false;
      if (merchantFilter !== 'ALL' && r.merchant.slug !== merchantFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.rewardTitle} ${r.programTitle} ${r.merchant.businessName}`.toLowerCase().includes(s);
    });
  }, [rows, tab, q, merchantFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    tab,
    q,
    merchantFilter,
  ]);

  const activeCount = rows.filter((r) => r.active).length;
  const inactiveCount = rows.length - activeCount;
  const totalCards = rows.reduce((s, r) => s + r.cardsCount, 0);
  const totalRedeems = rows.reduce((s, r) => s + r.redemptionsCount, 0);
  const avgStamps =
    rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.totalStamps, 0) / rows.length) : 0;
  const dates = rows.map((r) => r.createdAt);

  const topByRedemptions = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.redemptionsCount - a.redemptionsCount)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          label: r.rewardTitle,
          sub: r.merchant.businessName,
          value: num(r.redemptionsCount),
        })),
    [rows],
  );

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'inactive', label: 'Inactive', count: inactiveCount },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Rewards"
        subtitle="Reward catalog derived from loyalty programs."
        action={<AdminDateRangePill />}
      />

      <AdminError message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Rewards"
          value={num(rows.length)}
          trend={trendFromDates(dates)}
          icon={ICONS.gift}
        />
        <AdminStatCard
          label="Active"
          value={num(activeCount)}
          trend={trendFromDates(rows.filter((r) => r.active).map((r) => r.createdAt))}
          icon={ICONS.check}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <AdminStatCard
          label="Total cards"
          value={num(totalCards)}
          trend={trendFromDates(dates)}
          icon={ICONS.stamp}
          iconBg="bg-sky-50 text-sky-600"
        />
        <AdminStatCard
          label="Total redeems"
          value={num(totalRedeems)}
          trend={trendFromDates(dates)}
          icon={ICONS.ticket}
        />
        <AdminStatCard
          label="Avg stamps to unlock"
          value={num(avgStamps)}
          icon={ICONS.chart}
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
                  placeholder="Search rewards, programs, merchants…"
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
                      <th className="px-4 py-3">Reward</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Stamps</th>
                      <th className="px-4 py-3">Cards</th>
                      <th className="px-4 py-3">Redeemed</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="font-bold">{r.rewardTitle}</div>
                          {r.rewardDescription && (
                            <div className="mt-0.5 text-xs text-[#8E8E93]">{r.rewardDescription}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#636366]">{r.programTitle}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.merchant.logoUrl}
                              name={r.merchant.businessName}
                              size="sm"
                              rounded="xl"
                            />
                            <span className="font-semibold">{r.merchant.businessName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-extrabold">{r.totalStamps}</td>
                        <td className="px-4 py-3 font-bold text-[#FF5A5F]">{num(r.cardsCount)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">
                          {num(r.redemptionsCount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.active ? 'ACTIVE' : 'ENDED'} />
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={8}>
                          <AdminEmpty message="No rewards found." />
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
              title="Reward Status"
              centerValue={rows.length}
              centerLabel="Total"
              data={[
                { name: 'Active', value: activeCount, color: '#10B981' },
                { name: 'Inactive', value: inactiveCount, color: '#94A3B8' },
              ]}
            />
            <AdminRankList
              title="Top by Redemptions"
              items={topByRedemptions}
              empty="No redemption data yet."
            />
          </>
        }
      />
    </div>
  );
}
