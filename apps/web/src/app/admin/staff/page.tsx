'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
  StatusBadge,
  fmtDate,
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type StaffRow = {
  id: string;
  active: boolean;
  permissions: string;
  invitedAt: string;
  acceptedAt?: string | null;
  user: { name: string; email: string; photoUrl?: string | null };
  merchant: { id?: string; businessName: string; slug: string; logoUrl?: string | null };
  branch?: { name: string } | null;
};

type TabId = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function AdminStaffPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [tab, setTab] = useState<TabId>('ALL');
  const [q, setQ] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    setLoading(true);
    api<StaffRow[]>('/admin/staff', { token })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load staff'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function setActive(id: string, active: boolean) {
    if (!token) return;
    await api(`/admin/staff/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ active }),
    });
    setMsg(active ? 'Staff activated' : 'Staff deactivated');
    load();
  }

  const merchants = useMemo(() => {
    const names = new Set(rows.map((r) => r.merchant.businessName));
    return Array.from(names).sort();
  }, [rows]);

  const activeRows = rows.filter((r) => r.active);
  const inactiveRows = rows.filter((r) => !r.active);
  const pendingAccept = rows.filter((r) => !r.acceptedAt);
  const uniqueMerchants = new Set(rows.map((r) => r.merchant.businessName)).size;

  const tabCounts = {
    ALL: rows.length,
    ACTIVE: activeRows.length,
    INACTIVE: inactiveRows.length,
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab === 'ACTIVE' && !r.active) return false;
      if (tab === 'INACTIVE' && r.active) return false;
      if (merchantFilter !== 'ALL' && r.merchant.businessName !== merchantFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.user.name} ${r.user.email} ${r.merchant.businessName} ${r.branch?.name || ''}`
        .toLowerCase()
        .includes(s);
    });
  }, [rows, tab, q, merchantFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(
    filtered,
    [tab, q, merchantFilter],
  );

  const donutData = useMemo(
    () => [
      { name: 'Active', value: activeRows.length, color: '#10B981' },
      { name: 'Inactive', value: inactiveRows.length, color: '#94A3B8' },
    ],
    [activeRows.length, inactiveRows.length],
  );

  const topMerchants = useMemo(() => {
    const counts = new Map<string, { name: string; logoUrl?: string | null; count: number }>();
    for (const r of rows) {
      const key = r.merchant.id || r.merchant.slug;
      const prev = counts.get(key);
      counts.set(key, {
        name: r.merchant.businessName,
        logoUrl: r.merchant.logoUrl,
        count: (prev?.count || 0) + 1,
      });
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, v]) => ({
        id,
        label: v.name,
        value: v.count,
        imageUrl: v.logoUrl,
      }));
  }, [rows]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: tabCounts.ALL },
    { id: 'ACTIVE', label: 'Active', count: tabCounts.ACTIVE },
    { id: 'INACTIVE', label: 'Inactive', count: tabCounts.INACTIVE },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Staff"
        subtitle="Staff members invited across all merchants."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminDateRangePill />
          </div>
        }
      />

      <AdminError message={error} />
      <AdminSuccess message={msg} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Total Staff"
          value={loading && !rows.length ? '…' : num(rows.length)}
          trend={trendFromDates(rows.map((r) => r.invitedAt))}
          icon={ICONS.staff}
        />
        <AdminStatCard
          label="Active"
          value={num(activeRows.length)}
          trend={trendFromDates(activeRows.map((r) => r.invitedAt))}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.check}
        />
        <AdminStatCard
          label="Inactive"
          value={num(inactiveRows.length)}
          trend={trendFromDates(inactiveRows.map((r) => r.invitedAt))}
          iconBg="bg-slate-50 text-slate-500"
          icon={ICONS.alert}
          invertTrend
        />
        <AdminStatCard
          label="Merchants Covered"
          value={num(uniqueMerchants)}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Pending Accept"
          value={num(pendingAccept.length)}
          trend={trendFromDates(pendingAccept.map((r) => r.invitedAt))}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.ticket}
          invertTrend
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
                  placeholder="Search staff or business…"
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
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Business</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Invited</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.user.photoUrl}
                              name={r.user.name}
                              size="md"
                              rounded="full"
                            />
                            <div className="min-w-0">
                              <div className="font-bold">{r.user.name}</div>
                              <div className="truncate text-xs text-[#8E8E93]">{r.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar
                              src={r.merchant.logoUrl}
                              name={r.merchant.businessName}
                              size="md"
                              rounded="xl"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold">{r.merchant.businessName}</div>
                              <div className="text-xs text-[#8E8E93]">/{r.merchant.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{r.branch?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.active ? 'ACTIVE' : 'SUSPENDED'} />
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(r.invitedAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                              r.active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                            onClick={() => setActive(r.id, !r.active)}
                          >
                            {r.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={6}>
                          <AdminEmpty message="No staff members found." />
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
              title="Staff Status"
              centerValue={rows.length}
              centerLabel="Total"
              data={donutData}
            />
            <AdminRankList
              title="Top Merchants by Staff"
              items={topMerchants}
              empty="No staff data yet."
            />
            <AdminInsightCard
              title="Invitations"
              message={
                pendingAccept.length > 0
                  ? `${pendingAccept.length} staff invitation${pendingAccept.length === 1 ? '' : 's'} still pending acceptance.`
                  : 'All staff invitations have been accepted.'
              }
              href="/admin/merchants"
              hrefLabel="View Merchants"
            />
          </>
        }
      />
    </div>
  );
}
