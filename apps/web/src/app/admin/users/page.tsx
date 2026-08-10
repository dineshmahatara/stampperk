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

type UserRow = {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  role: string;
  language?: string;
  currency?: string;
  createdAt: string;
};

const ROLES = ['CUSTOMER', 'MERCHANT_OWNER', 'STAFF', 'SUPER_ADMIN'] as const;
type TabId = 'ALL' | (typeof ROLES)[number];

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: '#38BDF8',
  MERCHANT_OWNER: '#FF5A5F',
  STAFF: '#8B5CF6',
  SUPER_ADMIN: '#F59E0B',
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tab, setTab] = useState<TabId>('ALL');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [langFilter, setLangFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    setLoading(true);
    api<UserRow[]>('/admin/users', { token })
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function setRole(id: string, role: string) {
    if (!token) return;
    await api(`/admin/users/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role }),
    });
    setMsg(`Role updated to ${role}`);
    load();
  }

  async function softDelete(id: string) {
    if (!token) return;
    if (!confirm('Soft-delete this user account?')) return;
    await api(`/admin/users/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ deletedAt: new Date().toISOString() }),
    });
    setMsg('User soft-deleted');
    load();
  }

  const languages = useMemo(() => {
    const langs = new Set(users.map((u) => u.language).filter(Boolean) as string[]);
    return Array.from(langs).sort();
  }, [users]);

  const tabCounts = useMemo(
    () => ({
      ALL: users.length,
      CUSTOMER: users.filter((u) => u.role === 'CUSTOMER').length,
      MERCHANT_OWNER: users.filter((u) => u.role === 'MERCHANT_OWNER').length,
      STAFF: users.filter((u) => u.role === 'STAFF').length,
      SUPER_ADMIN: users.filter((u) => u.role === 'SUPER_ADMIN').length,
    }),
    [users],
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (tab !== 'ALL' && u.role !== tab) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (langFilter !== 'ALL' && u.language !== langFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(s);
    });
  }, [users, tab, q, roleFilter, langFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(
    filtered,
    [tab, q, roleFilter, langFilter],
  );

  const customers = users.filter((u) => u.role === 'CUSTOMER');
  const owners = users.filter((u) => u.role === 'MERCHANT_OWNER');
  const staff = users.filter((u) => u.role === 'STAFF');
  const admins = users.filter((u) => u.role === 'SUPER_ADMIN');

  const donutData = useMemo(
    () =>
      ROLES.map((r) => ({
        name: r.replace('_', ' '),
        value: users.filter((u) => u.role === r).length,
        color: ROLE_COLORS[r],
      })).filter((d) => d.value > 0),
    [users],
  );

  const recentJoined = useMemo(
    () =>
      [...users]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((u) => ({
          id: u.id,
          label: u.name,
          sub: u.email,
          value: fmtDate(u.createdAt).split(',')[0],
          imageUrl: u.photoUrl,
        })),
    [users],
  );

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: tabCounts.ALL },
    { id: 'CUSTOMER', label: 'Customers', count: tabCounts.CUSTOMER },
    { id: 'MERCHANT_OWNER', label: 'Owners', count: tabCounts.MERCHANT_OWNER },
    { id: 'STAFF', label: 'Staff', count: tabCounts.STAFF },
    { id: 'SUPER_ADMIN', label: 'Admins', count: tabCounts.SUPER_ADMIN },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Users"
        subtitle="All accounts on the Stampza platform."
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
          label="Total Users"
          value={loading && !users.length ? '…' : num(users.length)}
          trend={trendFromDates(users.map((u) => u.createdAt))}
          icon={ICONS.users}
        />
        <AdminStatCard
          label="Customers"
          value={num(customers.length)}
          trend={trendFromDates(customers.map((u) => u.createdAt))}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.users}
        />
        <AdminStatCard
          label="Owners"
          value={num(owners.length)}
          trend={trendFromDates(owners.map((u) => u.createdAt))}
          iconBg="bg-[#FFF0F1] text-[#FF5A5F]"
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Staff"
          value={num(staff.length)}
          trend={trendFromDates(staff.map((u) => u.createdAt))}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.staff}
        />
        <AdminStatCard
          label="Admins"
          value={num(admins.length)}
          trend={trendFromDates(admins.map((u) => u.createdAt))}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.settings}
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
                  placeholder="Search name, email, role…"
                />
                <AdminSelect value={roleFilter} onChange={setRoleFilter}>
                  <option value="ALL">All Roles</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </AdminSelect>
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
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Locale</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u) => (
                      <tr key={u.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar src={u.photoUrl} name={u.name} size="md" rounded="full" />
                            <span className="font-bold">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{u.email}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.role} />
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">
                          {u.language || '—'} / {u.currency || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#8E8E93]">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <select
                              className="rounded-xl border border-black/8 bg-white px-2 py-1.5 text-xs font-bold"
                              value={u.role}
                              onChange={(e) => setRole(u.id, e.target.value)}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                              onClick={() => softDelete(u.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={6}>
                          <AdminEmpty message="No users found." />
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
              title="Users by Role"
              centerValue={users.length}
              centerLabel="Total"
              data={donutData}
            />
            <AdminRankList title="Recently Joined" items={recentJoined} empty="No users yet." />
            <AdminInsightCard
              title="Customer Insight"
              message={`${customers.length} customer accounts on the platform. View detailed loyalty card data on the Customers page.`}
              href="/admin/customers"
              hrefLabel="View Customers"
            />
          </>
        }
      />
    </div>
  );
}
