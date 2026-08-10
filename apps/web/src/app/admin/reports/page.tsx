'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
  fmtDate,
} from '@/components/AdminPage';
import {
  AdminStatCard,
  AdminDateRangePill,
  AdminSplit,
  AdminDonutCard,
  AdminRankList,
  AdminLineCard,
  AdminInsightCard,
  num,
  ICONS,
} from '@/components/AdminInteractive';

type Report = {
  generatedAt: string;
  summary: {
    merchants: number;
    customers: number;
    stamps: number;
    redemptions: number;
    payingMerchants: number;
  };
  analytics: {
    stamps30: number;
    redemptions30: number;
    topMerchantsByStamps: { businessName: string; stamps: number }[];
    categories: { name: string; count: number }[];
  };
};

const CATEGORY_COLORS = ['#FF5A5F', '#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#94A3B8'];

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    setLoading(true);
    api<Report>('/admin/reports', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  const categoryDonut = useMemo(
    () =>
      (data?.analytics.categories || []).map((c, i) => ({
        name: c.name,
        value: c.count,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [data],
  );

  const topMerchants = useMemo(
    () =>
      (data?.analytics.topMerchantsByStamps || []).map((m, i) => ({
        id: `m-${i}`,
        label: m.businessName,
        value: num(m.stamps),
      })),
    [data],
  );

  const activitySeries = useMemo(
    () =>
      data
        ? [
            { label: 'Stamps (30d)', value: data.analytics.stamps30 },
            { label: 'Redeems (30d)', value: data.analytics.redemptions30 },
          ]
        : [],
    [data],
  );

  const insight = useMemo(() => {
    if (!data) return 'Generate a report to see platform summary and trends.';
    const conv =
      data.summary.stamps > 0
        ? Math.round((data.summary.redemptions / data.summary.stamps) * 100)
        : 0;
    return `${num(data.summary.payingMerchants)} paying merchants of ${num(data.summary.merchants)} total. Lifetime redemption rate ~${conv}%.`;
  }, [data]);

  function downloadJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stampza-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Merchants', data.summary.merchants],
      ['Customers', data.summary.customers],
      ['Stamps (lifetime)', data.summary.stamps],
      ['Redemptions (lifetime)', data.summary.redemptions],
      ['Paying merchants', data.summary.payingMerchants],
      ['Stamps (30d)', data.analytics.stamps30],
      ['Redemptions (30d)', data.analytics.redemptions30],
      ['Generated at', data.generatedAt],
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stampza-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = data?.summary;

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Reports"
        subtitle="Exportable platform summary for ops and finance."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data}
              className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-bold"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadJson}
              disabled={!data}
              className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)] disabled:opacity-50"
            >
              Download JSON
            </button>
            <AdminDateRangePill />
          </div>
        }
      />

      <AdminError message={error} />
      {data && (
        <p className="mb-4 text-sm font-semibold text-[#8E8E93]">
          Generated {fmtDate(data.generatedAt)}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Merchants"
          value={loading && !data ? '…' : num(s?.merchants ?? 0)}
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Customers"
          value={num(s?.customers ?? 0)}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.users}
        />
        <AdminStatCard
          label="Stamps"
          value={num(s?.stamps ?? 0)}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.stamp}
        />
        <AdminStatCard
          label="Redemptions"
          value={num(s?.redemptions ?? 0)}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.gift}
        />
        <AdminStatCard
          label="Paying"
          value={num(s?.payingMerchants ?? 0)}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.money}
        />
      </div>

      <AdminSplit
        main={
          <div className="space-y-4">
            <AdminSurface>
              <h2 className="font-extrabold">Platform summary</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Merchants', value: s?.merchants ?? 0 },
                      { label: 'Customers', value: s?.customers ?? 0 },
                      { label: 'Stamps (lifetime)', value: s?.stamps ?? 0 },
                      { label: 'Redemptions (lifetime)', value: s?.redemptions ?? 0 },
                      { label: 'Paying merchants', value: s?.payingMerchants ?? 0 },
                      { label: 'Stamps (30d)', value: data?.analytics.stamps30 ?? 0 },
                      { label: 'Redemptions (30d)', value: data?.analytics.redemptions30 ?? 0 },
                    ].map((row) => (
                      <tr key={row.label} className="border-t border-black/5">
                        <td className="px-4 py-2.5 font-semibold text-[#636366]">{row.label}</td>
                        <td className="px-4 py-2.5 text-right font-extrabold">{num(row.value)}</td>
                      </tr>
                    ))}
                    {!data && !loading && (
                      <tr>
                        <td colSpan={2}>
                          <AdminEmpty message="No report data available." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AdminSurface>

            <AdminSurface>
              <h2 className="font-extrabold">Category breakdown</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Merchants</th>
                      <th className="px-4 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.analytics.categories || []).map((c) => {
                      const total =
                        data?.analytics.categories.reduce((sum, x) => sum + x.count, 0) || 1;
                      const pct = Math.round((c.count / total) * 100);
                      return (
                        <tr key={c.name} className="border-t border-black/5">
                          <td className="px-4 py-2.5 font-bold">{c.name}</td>
                          <td className="px-4 py-2.5 text-right font-extrabold">{num(c.count)}</td>
                          <td className="px-4 py-2.5 text-right text-[#8E8E93]">{pct}%</td>
                        </tr>
                      );
                    })}
                    {!data?.analytics.categories?.length && (
                      <tr>
                        <td colSpan={3}>
                          <AdminEmpty message="No category data in this report." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AdminSurface>

            {data && (
              <AdminLineCard
                title="30-day activity"
                subtitle="Stamps vs redemptions"
                value={`${num(data.analytics.stamps30)} / ${num(data.analytics.redemptions30)}`}
                data={activitySeries}
              />
            )}
          </div>
        }
        side={
          <>
            {data && (
              <>
                <AdminDonutCard
                  title="Categories"
                  centerValue={num(data.analytics.categories.reduce((s, c) => s + c.count, 0))}
                  centerLabel="Merchants"
                  data={categoryDonut}
                />
                <AdminRankList
                  title="Top merchants by stamps"
                  items={topMerchants}
                  empty="No merchant stamp data."
                />
              </>
            )}
            <AdminInsightCard
              title="Report insight"
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
