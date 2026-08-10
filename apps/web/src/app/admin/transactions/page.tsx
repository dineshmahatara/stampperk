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
  AdminLineCard,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSurface,
  StatusBadge,
  fmtDate,
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type Tx = {
  id: string;
  type: string;
  amount: number;
  label: string;
  merchant: string;
  slug: string;
  logoUrl?: string | null;
  photoUrl?: string | null;
  createdAt: string;
};

type TabId = 'ALL' | 'SALE' | 'SALES_ADJ' | 'SAVINGS_ADJ';

const TYPE_COLORS: Record<string, string> = {
  SALE: '#FF5A5F',
  SALES_ADJ: '#F59E0B',
  SAVINGS_ADJ: '#8B5CF6',
};

export default function AdminTransactionsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [tab, setTab] = useState<TabId>('ALL');
  const [q, setQ] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<{ rows: Tx[] }>('/admin/transactions', { token })
      .then((r) => setRows(r.rows || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [token]);

  const merchants = useMemo(() => {
    const names = new Set(rows.map((r) => r.merchant));
    return Array.from(names).sort();
  }, [rows]);

  const sales = rows.filter((r) => r.type === 'SALE');
  const adjustments = rows.filter((r) => r.type !== 'SALE');
  const salesAmount = sales.reduce((s, r) => s + (r.amount || 0), 0);

  const tabCounts = {
    ALL: rows.length,
    SALE: sales.length,
    SALES_ADJ: rows.filter((r) => r.type === 'SALES_ADJ').length,
    SAVINGS_ADJ: rows.filter((r) => r.type === 'SAVINGS_ADJ').length,
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== 'ALL' && r.type !== tab) return false;
      if (merchantFilter !== 'ALL' && r.merchant !== merchantFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.label} ${r.merchant} ${r.type}`.toLowerCase().includes(s);
    });
  }, [rows, tab, q, merchantFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(
    filtered,
    [tab, q, merchantFilter],
  );

  const totalAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);

  const donutData = useMemo(() => {
    const types = ['SALE', 'SALES_ADJ', 'SAVINGS_ADJ'] as const;
    return types
      .map((t) => ({
        name: t.replace('_', ' '),
        value: rows.filter((r) => r.type === t).length,
        color: TYPE_COLORS[t],
      }))
      .filter((d) => d.value > 0);
  }, [rows]);

  const dailyChart = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const day = new Date(r.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      byDay.set(day, (byDay.get(day) || 0) + (r.amount || 0));
    }
    return [...byDay.entries()]
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-14)
      .map(([label, value]) => ({ label, value }));
  }, [rows]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: tabCounts.ALL },
    { id: 'SALE', label: 'Sales', count: tabCounts.SALE },
    { id: 'SALES_ADJ', label: 'Sales Adj.', count: tabCounts.SALES_ADJ },
    { id: 'SAVINGS_ADJ', label: 'Savings Adj.', count: tabCounts.SAVINGS_ADJ },
  ];

  function exportCsv() {
    const header = ['Type', 'Merchant', 'Detail', 'Amount', 'When'];
    const lines = filtered.map((r) =>
      [r.type, r.merchant, r.label, r.amount, r.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Transactions"
        subtitle="Sales linked to stamps and merchant adjustments."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminDateRangePill />
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-bold hover:bg-[#FFF8F7]"
            >
              Export
            </button>
          </div>
        }
      />

      <AdminError message={error} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Records"
          value={loading && !rows.length ? '…' : num(filtered.length)}
          trend={trendFromDates(rows.map((r) => r.createdAt))}
          icon={ICONS.activity}
        />
        <AdminStatCard
          label="Amount Sum"
          value={num(totalAmount)}
          iconBg="bg-[#FFF0F1] text-[#FF5A5F]"
          icon={ICONS.money}
        />
        <AdminStatCard
          label="Sales Count"
          value={num(sales.length)}
          trend={trendFromDates(sales.map((r) => r.createdAt))}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.check}
        />
        <AdminStatCard
          label="Sales Amount"
          value={num(salesAmount)}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.money}
        />
        <AdminStatCard
          label="Adjustments"
          value={num(adjustments.length)}
          trend={trendFromDates(adjustments.map((r) => r.createdAt))}
          iconBg="bg-amber-50 text-amber-600"
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
                  placeholder="Search merchant or reason…"
                />
                <AdminSelect value={merchantFilter} onChange={setMerchantFilter}>
                  <option value="ALL">All Merchants</option>
                  {merchants.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </AdminSelect>
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={`${r.type}-${r.id}`} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <StatusBadge status={r.type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.logoUrl}
                              name={r.merchant}
                              size="md"
                              rounded="xl"
                            />
                            <div className="min-w-0">
                              <div className="font-bold">{r.merchant}</div>
                              <div className="text-xs text-[#8E8E93]">/{r.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{r.label}</td>
                        <td className="px-4 py-3 font-extrabold text-[#FF5A5F]">
                          {Number(r.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={5}>
                          <AdminEmpty message="No transactions yet." />
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
              title="By Type"
              centerValue={rows.length}
              centerLabel="Records"
              data={donutData}
            />
            <AdminLineCard
              title="Daily Amounts"
              subtitle="Last 14 days"
              value={num(rows.reduce((s, r) => s + (r.amount || 0), 0))}
              data={dailyChart}
            />
            <AdminInsightCard
              title="Transaction Summary"
              message={
                sales.length > 0
                  ? `${sales.length} sales totalling ${num(salesAmount)}. ${adjustments.length} adjustment${adjustments.length === 1 ? '' : 's'} recorded.`
                  : 'No sales recorded yet. Transactions will appear as merchants link sales to stamps.'
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
