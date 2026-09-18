'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BUSINESS_INDUSTRIES, normalizeCountryCode, type AddressFormValue } from '@stampperk/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AddressPicker } from '@/components/AddressPicker';
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
} from '@/components/AdminPage';
import { EntityAvatar } from '@/components/EntityAvatar';

type MerchantRow = {
  id: string;
  businessName: string;
  status: string;
  slug: string;
  logoUrl?: string | null;
  category?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  ward?: string | null;
  address?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  currency?: string | null;
  createdAt?: string;
  owner?: { id?: string; email?: string; name?: string };
  subscription?: { plan?: string; status?: string };
};

type FormState = {
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  businessName: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  plan: 'FREE' | 'MONTHLY' | 'YEARLY';
  timezone: string;
  currency: string;
  address: AddressFormValue;
};

type TabId = 'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10B981',
  PENDING: '#F59E0B',
  SUSPENDED: '#EF4444',
};

const emptyForm = (): FormState => ({
  ownerEmail: '',
  ownerName: '',
  ownerPassword: '',
  businessName: '',
  category: BUSINESS_INDUSTRIES[0] || 'Cafe & Coffee',
  description: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  plan: 'FREE',
  timezone: 'Asia/Kathmandu',
  currency: 'NPR',
  address: {
    country: 'NP',
    province: '',
    district: '',
    city: '',
    municipality: '',
    ward: '',
    street: '',
    postalCode: '',
  },
});

const inputClass =
  'w-full rounded-xl border border-black/10 bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF5A5F]/25';
const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export default function AdminMerchantsPage() {
  const { token } = useAuth();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<TabId>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  function load() {
    if (!token) return;
    api<MerchantRow[]>('/admin/merchants', { token })
      .then(setMerchants)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [token]);

  const activeMerchants = merchants.filter((m) => m.status === 'ACTIVE');
  const pendingMerchants = merchants.filter((m) => m.status === 'PENDING');
  const suspendedMerchants = merchants.filter((m) => m.status === 'SUSPENDED');
  const payingMerchants = merchants.filter((m) => {
    const plan = m.subscription?.plan;
    return plan === 'MONTHLY' || plan === 'YEARLY';
  });

  const categories = useMemo(() => {
    const cats = new Set(merchants.map((m) => m.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [merchants]);

  const tabCounts = useMemo(
    () => ({
      ALL: merchants.length,
      ACTIVE: activeMerchants.length,
      PENDING: pendingMerchants.length,
      SUSPENDED: suspendedMerchants.length,
    }),
    [merchants.length, activeMerchants.length, pendingMerchants.length, suspendedMerchants.length],
  );

  const filtered = useMemo(() => {
    return merchants.filter((m) => {
      if (tab !== 'ALL' && m.status !== tab) return false;
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (planFilter !== 'ALL' && (m.subscription?.plan || 'FREE') !== planFilter) return false;
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${m.businessName} ${m.slug} ${m.category} ${m.owner?.email} ${m.city}`
        .toLowerCase()
        .includes(s);
    });
  }, [merchants, tab, statusFilter, planFilter, categoryFilter, q]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    tab,
    q,
    statusFilter,
    planFilter,
    categoryFilter,
  ]);

  const donutData = useMemo(
    () =>
      (['ACTIVE', 'PENDING', 'SUSPENDED'] as const)
        .map((st) => ({
          name: st.charAt(0) + st.slice(1).toLowerCase(),
          value: merchants.filter((m) => m.status === st).length,
          color: STATUS_COLORS[st],
        }))
        .filter((d) => d.value > 0),
    [merchants],
  );

  const categoryRank = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of merchants) {
      const cat = m.category || 'Uncategorized';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        id: label,
        label,
        sub: `${value} merchant${value !== 1 ? 's' : ''}`,
        value: num(value),
      }));
  }, [merchants]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: tabCounts.ALL },
    { id: 'ACTIVE', label: 'Active', count: tabCounts.ACTIVE },
    { id: 'PENDING', label: 'Pending', count: tabCounts.PENDING },
    { id: 'SUSPENDED', label: 'Suspended', count: tabCounts.SUSPENDED },
  ];

  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setMode('create');
    setError('');
    setMsg('');
  }

  function openEdit(m: MerchantRow) {
    setEditingId(m.id);
    setForm({
      ownerEmail: m.owner?.email || '',
      ownerName: m.owner?.name || '',
      ownerPassword: '',
      businessName: m.businessName || '',
      category: m.category || BUSINESS_INDUSTRIES[0] || 'Cafe & Coffee',
      description: m.description || '',
      phone: m.phone || '',
      email: m.email || '',
      status: (m.status as FormState['status']) || 'ACTIVE',
      plan: (m.subscription?.plan as FormState['plan']) || 'FREE',
      timezone: m.timezone || 'Asia/Kathmandu',
      currency: m.currency || 'NPR',
      address: {
        country: normalizeCountryCode(m.country) || 'NP',
        province: m.province || '',
        district: m.district || '',
        city: m.city || '',
        municipality: m.municipality || '',
        ward: m.ward || '',
        street: m.address || '',
        postalCode: m.postalCode || '',
      },
    });
    setMode('edit');
    setError('');
    setMsg('');
  }

  async function setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    if (!token) return;
    await api(`/admin/merchants/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
    setMerchants((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setMsg(`Status set to ${status}`);
  }

  async function remove(id: string, name: string) {
    if (!token) return;
    if (!confirm(`Delete merchant “${name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/admin/merchants/${id}`, { method: 'DELETE', token });
      setMsg('Merchant deleted');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    const payload = {
      ownerEmail: form.ownerEmail.trim(),
      ownerName: form.ownerName.trim() || undefined,
      ownerPassword: form.ownerPassword || undefined,
      businessName: form.businessName.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      status: form.status,
      plan: form.plan,
      timezone: form.timezone,
      currency: form.currency,
      country: form.address.country || 'NP',
      province: form.address.province || undefined,
      district: form.address.district || undefined,
      city: form.address.city || undefined,
      municipality: form.address.municipality || undefined,
      ward: form.address.ward || undefined,
      address: form.address.street || undefined,
      postalCode: form.address.postalCode || undefined,
    };

    try {
      if (mode === 'create') {
        await api('/admin/merchants', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        setMsg('Merchant created');
      } else if (editingId) {
        await api(`/admin/merchants/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            ...payload,
            ownerPassword: undefined,
            ownerName: undefined,
          }),
        });
        setMsg('Merchant updated');
      }
      setMode('closed');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Merchants"
        subtitle="Approve, monitor, and manage businesses on Stamp Perk."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminDateRangePill />
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)]"
            >
              + Add New Merchant
            </button>
          </div>
        }
      />

      <AdminError message={error} />
      <AdminSuccess message={msg} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Total"
          value={num(merchants.length)}
          trend={trendFromDates(merchants.map((m) => m.createdAt))}
          icon={ICONS.store}
        />
        <AdminStatCard
          label="Active"
          value={num(activeMerchants.length)}
          trend={trendFromDates(activeMerchants.map((m) => m.createdAt))}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.check}
        />
        <AdminStatCard
          label="Pending"
          value={num(pendingMerchants.length)}
          trend={trendFromDates(pendingMerchants.map((m) => m.createdAt))}
          iconBg="bg-amber-50 text-amber-600"
          icon={ICONS.alert}
        />
        <AdminStatCard
          label="Suspended"
          value={num(suspendedMerchants.length)}
          trend={trendFromDates(suspendedMerchants.map((m) => m.createdAt))}
          iconBg="bg-red-50 text-red-600"
          icon={ICONS.alert}
        />
        <AdminStatCard
          label="Paying"
          value={num(payingMerchants.length)}
          trend={trendFromDates(payingMerchants.map((m) => m.createdAt))}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.money}
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
                  placeholder="Search merchant, slug, owner, city…"
                />
                <AdminSelect value={statusFilter} onChange={setStatusFilter}>
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </AdminSelect>
                <AdminSelect value={planFilter} onChange={setPlanFilter}>
                  <option value="ALL">All Plans</option>
                  <option value="FREE">Free</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </AdminSelect>
                <AdminSelect value={categoryFilter} onChange={setCategoryFilter}>
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </AdminSelect>
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Merchant</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((m) => (
                      <tr key={m.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <EntityAvatar src={m.logoUrl} name={m.businessName} size="md" rounded="xl" />
                            <div>
                              <div className="font-bold">{m.businessName}</div>
                              <div className="text-xs text-[#8E8E93]">/{m.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                            {m.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{m.subscription?.plan || 'FREE'}</td>
                        <td className="px-4 py-3 text-[#8E8E93]">{m.owner?.email || '—'}</td>
                        <td className="px-4 py-3 text-[#8E8E93]">{m.city || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800"
                              onClick={() => openEdit(m)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"
                              onClick={() => setStatus(m.id, 'ACTIVE')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"
                              onClick={() => setStatus(m.id, 'PENDING')}
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-800"
                              onClick={() => setStatus(m.id, 'SUSPENDED')}
                            >
                              Suspend
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 disabled:opacity-50"
                              onClick={() => remove(m.id, m.businessName)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length && !error && (
                      <tr>
                        <td colSpan={7}>
                          <AdminEmpty message="No merchants yet. Use + Add New Merchant to create one." />
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
              title="Merchants by Status"
              centerValue={merchants.length}
              centerLabel="Total"
              data={donutData}
            />
            <AdminRankList
              title="Top Categories"
              items={categoryRank}
              empty="No category data yet."
            />
            <AdminInsightCard
              title="Business Map"
              message={`${merchants.length} businesses registered. View merchant locations on the interactive map.`}
              href="/admin/business-map"
              hrefLabel="Open Business Map"
            />
          </>
        }
      />

      {mode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={save}
            className="my-6 w-full max-w-3xl rounded-3xl border border-black/5 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">
                  {mode === 'create' ? 'Add New Merchant' : 'Edit Merchant'}
                </h2>
                <p className="mt-1 text-sm text-[#8E8E93]">
                  {mode === 'create'
                    ? 'Create a business and owner account (or attach an existing user by email).'
                    : 'Update business details, plan, status, and owner email.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('closed')}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-black/5 bg-[#FAFAFB] p-4">
                <h3 className="mb-3 text-sm font-extrabold">Owner account</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Owner email *">
                    <input
                      className={inputClass}
                      type="email"
                      required
                      value={form.ownerEmail}
                      onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                      placeholder="owner@business.com"
                    />
                  </Field>
                  {mode === 'create' && (
                    <>
                      <Field label="Owner name (new user)">
                        <input
                          className={inputClass}
                          value={form.ownerName}
                          onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                          placeholder="Required if email is new"
                        />
                      </Field>
                      <Field label="Owner password (new user)">
                        <input
                          className={inputClass}
                          type="password"
                          value={form.ownerPassword}
                          onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))}
                          placeholder="Min 8 chars if creating new user"
                        />
                      </Field>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFB] p-4">
                <h3 className="mb-3 text-sm font-extrabold">Business</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Business name *">
                    <input
                      className={inputClass}
                      required
                      value={form.businessName}
                      onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    />
                  </Field>
                  <Field label="Category *">
                    <select
                      className={inputClass}
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {BUSINESS_INDUSTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="Business phone">
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </Field>
                  <Field label="Business email">
                    <input
                      className={inputClass}
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      className={inputClass}
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as FormState['status'],
                        }))
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </Field>
                  <Field label="Plan">
                    <select
                      className={inputClass}
                      value={form.plan}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, plan: e.target.value as FormState['plan'] }))
                      }
                    >
                      <option value="FREE">FREE</option>
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="YEARLY">YEARLY</option>
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <input
                      className={inputClass}
                      value={form.timezone}
                      onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                    />
                  </Field>
                  <Field label="Currency">
                    <input
                      className={inputClass}
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFB] p-4">
                <h3 className="mb-3 text-sm font-extrabold">Address</h3>
                <AddressPicker
                  value={form.address}
                  onChange={(address) => setForm((f) => ({ ...f, address }))}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode('closed')}
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Saving…' : mode === 'create' ? 'Create merchant' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
