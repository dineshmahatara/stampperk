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
import { EntityAvatar } from '@/components/EntityAvatar';
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
  AdminRankList,
  AdminLineCard,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';

type Stamp = {
  id: string;
  saleAmount?: number | null;
  createdAt: string;
  merchant: { businessName: string; slug: string; logoUrl?: string | null };
  customer: { name: string; email: string; photoUrl?: string | null };
  program: { title: string; totalStamps: number };
  issuedBy: { name: string; email: string; photoUrl?: string | null };
};

type TabId = 'all' | 'with_sale' | 'no_sale';

function dailyCounts(rows: { createdAt: string }[], days = 14) {
  const map = new Map<string, number>();
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.createdAt.slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).map(([key, value]) => ({
    label: new Date(key + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    value,
  }));
}

export default function AdminStampTransactionsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Stamp[]>([]);
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Stamp[]>('/admin/stamps', { token })
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

  const withSale = rows.filter((r) => r.saleAmount != null);
  const noSale = rows.filter((r) => r.saleAmount == null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'with_sale' && r.saleAmount == null) return false;
      if (tab === 'no_sale' && r.saleAmount != null) return false;
      if (merchantFilter !== 'ALL' && r.merchant.slug !== merchantFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.merchant.businessName} ${r.customer.name} ${r.program.title} ${r.issuedBy.name}`
        .toLowerCase()
        .includes(s);
    });
  }, [rows, tab, q, merchantFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    tab,
    q,
    merchantFilter,
  ]);

  const saleVolume = rows.reduce((s, r) => s + (r.saleAmount ?? 0), 0);
  const uniqueCustomers = new Set(rows.map((r) => r.customer.email)).size;
  const uniqueMerchants = new Set(rows.map((r) => r.merchant.slug)).size;
  const dates = rows.map((r) => r.createdAt);

  const topMerchants = useMemo(() => {
    const map = new Map<string, { name: string; logoUrl?: string | null; count: number }>();
    for (const r of rows) {
      const prev = map.get(r.merchant.slug);
      map.set(r.merchant.slug, {
        name: r.merchant.businessName,
        logoUrl: r.merchant.logoUrl,
        count: (prev?.count || 0) + 1,
      });
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([slug, v]) => ({
        id: slug,
        label: v.name,
        value: num(v.count),
        imageUrl: v.logoUrl,
      }));
  }, [rows]);

  const lineData = useMemo(() => dailyCounts(rows), [rows]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'with_sale', label: 'With sale', count: withSale.length },
    { id: 'no_sale', label: 'No sale', count: noSale.length },
  ];

  function exportCsv() {
    const header = [
      'Customer',
      'Email',
      'Merchant',
      'Program',
      'Issued by',
      'Sale',
      'When',
    ];
    const lines = filtered.map((r) =>
      [
        r.customer.name,
        r.customer.email,
        r.merchant.businessName,
        r.program.title,
        r.issuedBy.name,
        r.saleAmount ?? '',
        r.createdAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stamp-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Stamp Transactions"
        subtitle="Every stamp issued on the platform."
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
          label="Stamps"
          value={num(rows.length)}
          trend={trendFromDates(dates)}
          icon={ICONS.stamp}
        />
        <AdminStatCard
          label="With sale amount"
          value={num(withSale.length)}
          trend={trendFromDates(withSale.map((r) => r.createdAt))}
          icon={ICONS.money}
        />
        <AdminStatCard
          label="Sale volume sum"
          value={num(saleVolume)}
          icon={ICONS.chart}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <AdminStatCard
          label="Unique customers"
          value={num(uniqueCustomers)}
          trend={trendFromDates(dates)}
          icon={ICONS.users}
          iconBg="bg-violet-50 text-violet-600"
        />
        <AdminStatCard
          label="Unique merchants"
          value={num(uniqueMerchants)}
          icon={ICONS.store}
          iconBg="bg-sky-50 text-sky-600"
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
                  placeholder="Search customers, merchants, programs…"
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
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Program</th>
                      <th className="px-4 py-3">Issued by</th>
                      <th className="px-4 py-3">Sale</th>
                      <th className="px-4 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.customer.photoUrl}
                              name={r.customer.name}
                              size="md"
                              rounded="full"
                            />
                            <div className="min-w-0">
                              <div className="font-bold">{r.customer.name}</div>
                              <div className="truncate text-xs text-[#8E8E93]">{r.customer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.merchant.logoUrl}
                              name={r.merchant.businessName}
                              size="sm"
                              rounded="xl"
                            />
                            <span>{r.merchant.businessName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#636366]">{r.program.title}</td>
                        <td className="px-4 py-3 text-[#8E8E93]">{r.issuedBy.name}</td>
                        <td className="px-4 py-3 font-bold text-[#FF5A5F]">
                          {r.saleAmount != null ? num(r.saleAmount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={6}>
                          <AdminEmpty message="No stamp transactions yet." />
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
            <AdminRankList
              title="Top Merchants"
              items={topMerchants}
              empty="No stamp data yet."
            />
            <AdminLineCard
              title="Daily Stamp Volume"
              subtitle="Last 14 days"
              value={num(rows.length)}
              data={lineData}
            />
          </>
        }
      />
    </div>
  );
}
