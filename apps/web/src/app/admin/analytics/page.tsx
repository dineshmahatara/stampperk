'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
} from '@/components/AdminPage';
import {
  AdminStatCard,
  AdminDateRangePill,
  AdminSectionTabs,
  AdminSplit,
  AdminDonutCard,
  AdminRankList,
  AdminLineCard,
  AdminInsightCard,
  num,
  ICONS,
} from '@/components/AdminInteractive';

type Analytics = {
  merchantsByStatus: { status: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  stamps30: number;
  redemptions30: number;
  campaignsByStatus: { status: string; count: number }[];
  topMerchantsByStamps: { businessName: string; stamps: number }[];
  categories: { name: string; count: number }[];
};

type TabId = 'overview' | 'merchants' | 'users' | 'categories' | 'campaigns';

const STATUS_COLORS = ['#FF5A5F', '#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#94A3B8', '#EC4899'];

function toDonut(
  rows: { status?: string; role?: string; name?: string; count: number }[],
  key: 'status' | 'role' | 'name',
) {
  return rows.map((r, i) => ({
    name: String(r[key] ?? 'Unknown'),
    value: r.count,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<Analytics>('/admin/analytics', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [token]);

  const merchantTotal = useMemo(
    () => data?.merchantsByStatus.reduce((s, x) => s + x.count, 0) ?? 0,
    [data],
  );
  const userTotal = useMemo(
    () => data?.usersByRole.reduce((s, x) => s + x.count, 0) ?? 0,
    [data],
  );
  const campaignTotal = useMemo(
    () => data?.campaignsByStatus.reduce((s, x) => s + x.count, 0) ?? 0,
    [data],
  );

  const stampRedeemSeries = useMemo(
    () => [
      { label: 'Stamps', value: data?.stamps30 ?? 0 },
      { label: 'Redeems', value: data?.redemptions30 ?? 0 },
    ],
    [data],
  );

  const topMerchants = useMemo(
    () =>
      (data?.topMerchantsByStamps || []).map((m, i) => ({
        id: `m-${i}`,
        label: m.businessName,
        value: num(m.stamps),
      })),
    [data],
  );

  const categoryDonut = useMemo(
    () =>
      (data?.categories || []).map((c, i) => ({
        name: c.name,
        value: c.count,
        color: STATUS_COLORS[i % STATUS_COLORS.length],
      })),
    [data],
  );

  const insight = useMemo(() => {
    if (!data) return 'Loading platform analytics…';
    const top = data.topMerchantsByStamps[0];
    if (top) {
      return `${top.businessName} leads with ${num(top.stamps)} stamps. ${num(data.stamps30)} stamps and ${num(data.redemptions30)} redemptions in the last 30 days.`;
    }
    return `${num(data.stamps30)} stamps and ${num(data.redemptions30)} redemptions recorded in the last 30 days across ${num(merchantTotal)} merchants.`;
  }, [data, merchantTotal]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'merchants', label: 'Merchants' },
    { id: 'users', label: 'Users' },
    { id: 'categories', label: 'Categories' },
    { id: 'campaigns', label: 'Campaigns' },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Analytics"
        subtitle="Deeper platform trends and cohorts."
        action={<AdminDateRangePill />}
      />

      <AdminError message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Stamps (30d)"
          value={loading && !data ? '…' : num(data?.stamps30 ?? 0)}
          icon={ICONS.stamp}
        />
        <AdminStatCard
          label="Redeems (30d)"
          value={num(data?.redemptions30 ?? 0)}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.gift}
        />
        <AdminStatCard
          label="Merchants"
          value={num(merchantTotal)}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Users"
          value={num(userTotal)}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.users}
        />
        <AdminStatCard
          label="Campaigns"
          value={num(campaignTotal)}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.promo}
        />
      </div>

      <AdminSplit
        main={
          <AdminSurface className="!p-0 overflow-hidden">
            <AdminSectionTabs tabs={tabs} value={tab} onChange={setTab} />
            <div className="p-4">
              {tab === 'overview' && data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminLineCard
                    title="30-day activity"
                    subtitle="Stamps vs redemptions"
                    value={`${num(data.stamps30)} / ${num(data.redemptions30)}`}
                    data={stampRedeemSeries}
                    color="#FF5A5F"
                  />
                  <AdminDonutCard
                    title="Merchants by status"
                    centerValue={num(merchantTotal)}
                    centerLabel="Merchants"
                    data={toDonut(data.merchantsByStatus, 'status')}
                  />
                  <AdminDonutCard
                    title="Users by role"
                    centerValue={num(userTotal)}
                    centerLabel="Users"
                    data={toDonut(data.usersByRole, 'role')}
                  />
                  <AdminRankList title="Top merchants by stamps" items={topMerchants} />
                </div>
              )}

              {tab === 'merchants' && data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminDonutCard
                    title="Merchants by status"
                    centerValue={num(merchantTotal)}
                    centerLabel="Total"
                    data={toDonut(data.merchantsByStatus, 'status')}
                  />
                  <AdminRankList title="Top merchants by stamps" items={topMerchants} />
                  <AdminSurface className="md:col-span-2">
                    <h3 className="font-extrabold">Status breakdown</h3>
                    <div className="mt-3 space-y-2">
                      {data.merchantsByStatus.map((g) => {
                        const pct = merchantTotal ? Math.round((g.count / merchantTotal) * 100) : 0;
                        return (
                          <div key={g.status}>
                            <div className="mb-1 flex justify-between text-xs font-semibold">
                              <span className="text-[#636366]">{g.status}</span>
                              <span className="font-extrabold">
                                {num(g.count)} · {pct}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#F4F5F7]">
                              <div
                                className="h-full rounded-full bg-[#FF5A5F]"
                                style={{ width: `${Math.max(pct, g.count ? 4 : 0)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!data.merchantsByStatus.length && (
                        <AdminEmpty message="No merchant status data yet." />
                      )}
                    </div>
                  </AdminSurface>
                </div>
              )}

              {tab === 'users' && data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminDonutCard
                    title="Users by role"
                    centerValue={num(userTotal)}
                    centerLabel="Total"
                    data={toDonut(data.usersByRole, 'role')}
                  />
                  <AdminSurface>
                    <h3 className="font-extrabold">Role distribution</h3>
                    <div className="mt-3 space-y-2">
                      {data.usersByRole.map((g, i) => {
                        const pct = userTotal ? Math.round((g.count / userTotal) * 100) : 0;
                        const color = STATUS_COLORS[i % STATUS_COLORS.length];
                        return (
                          <div key={g.role}>
                            <div className="mb-1 flex justify-between text-xs font-semibold">
                              <span className="text-[#636366]">{g.role}</span>
                              <span className="font-extrabold">
                                {num(g.count)} · {pct}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#F4F5F7]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(pct, g.count ? 4 : 0)}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!data.usersByRole.length && <AdminEmpty message="No user role data yet." />}
                    </div>
                  </AdminSurface>
                </div>
              )}

              {tab === 'categories' && data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminDonutCard
                    title="Merchant categories"
                    centerValue={num(data.categories.reduce((s, c) => s + c.count, 0))}
                    centerLabel="Merchants"
                    data={categoryDonut}
                  />
                  <AdminSurface>
                    <h3 className="font-extrabold">Category breakdown</h3>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-black/5">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                          <tr>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Count</th>
                            <th className="px-4 py-3 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.categories.map((c) => {
                            const total = data.categories.reduce((s, x) => s + x.count, 0) || 1;
                            const pct = Math.round((c.count / total) * 100);
                            return (
                              <tr key={c.name} className="border-t border-black/5">
                                <td className="px-4 py-2.5 font-bold">{c.name}</td>
                                <td className="px-4 py-2.5 text-right font-extrabold">{num(c.count)}</td>
                                <td className="px-4 py-2.5 text-right text-[#8E8E93]">{pct}%</td>
                              </tr>
                            );
                          })}
                          {!data.categories.length && (
                            <tr>
                              <td colSpan={3}>
                                <AdminEmpty message="No category data yet." />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </AdminSurface>
                </div>
              )}

              {tab === 'campaigns' && data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminDonutCard
                    title="Campaigns by status"
                    centerValue={num(campaignTotal)}
                    centerLabel="Total"
                    data={toDonut(
                      data.campaignsByStatus.map((c) => ({ status: c.status, count: c.count })),
                      'status',
                    )}
                  />
                  <AdminSurface>
                    <h3 className="font-extrabold">Campaign status</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {data.campaignsByStatus.map((g, i) => (
                        <div
                          key={g.status}
                          className="rounded-xl border border-black/5 bg-gradient-to-br from-white to-[#FFF8F7] p-4"
                        >
                          <div
                            className="text-xs font-bold uppercase tracking-wide"
                            style={{ color: STATUS_COLORS[i % STATUS_COLORS.length] }}
                          >
                            {g.status}
                          </div>
                          <div className="mt-1 text-2xl font-extrabold">{num(g.count)}</div>
                        </div>
                      ))}
                      {!data.campaignsByStatus.length && (
                        <div className="sm:col-span-2">
                          <AdminEmpty message="No campaigns yet." />
                        </div>
                      )}
                    </div>
                  </AdminSurface>
                </div>
              )}

              {!data && !loading && <AdminEmpty message="No analytics data available." />}
            </div>
          </AdminSurface>
        }
        side={
          <>
            {data && (
              <>
                <AdminLineCard
                  title="Activity comparison"
                  subtitle="Last 30 days"
                  data={stampRedeemSeries}
                  color="#8B5CF6"
                />
                <AdminRankList
                  title="Top merchants"
                  items={topMerchants.slice(0, 5)}
                  empty="No stamp data yet."
                />
                <AdminDonutCard
                  title="Categories"
                  centerValue={num(data.categories.length)}
                  centerLabel="Types"
                  data={categoryDonut.slice(0, 6)}
                />
              </>
            )}
            <AdminInsightCard
              title="Platform insight"
              message={insight}
              href="/admin/reports"
              hrefLabel="Export report"
            />
          </>
        }
      />
    </div>
  );
}
