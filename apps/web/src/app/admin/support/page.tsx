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
  AdminSuccess,
  AdminSectionTabs,
  AdminToolbar,
  AdminToolbarSearch,
  AdminSelect,
  AdminPagination,
  useAdminPagination,
  AdminSplit,
  AdminDonutCard,
  AdminInsightCard,
  trendFromDates,
  num,
  ICONS,
} from '@/components/AdminInteractive';

type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  requesterEmail?: string | null;
  requesterName?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TabId = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#38BDF8',
  IN_PROGRESS: '#8B5CF6',
  RESOLVED: '#10B981',
  CLOSED: '#94A3B8',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F59E0B',
  NORMAL: '#94A3B8',
  LOW: '#CBD5E1',
};

export default function AdminSupportPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<TabId>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  function load() {
    if (!token) return;
    api<Ticket[]>('/admin/support-tickets', { token })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tickets'));
  }

  useEffect(load, [token]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !subject.trim() || !body.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api('/admin/support-tickets', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subject,
          body,
          priority,
          requesterName: 'Admin',
          requesterEmail: 'admin@stampz.app',
        }),
      });
      setSubject('');
      setBody('');
      setPriority('NORMAL');
      setCreateOpen(false);
      setMsg('Ticket created');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    if (!token) return;
    await api(`/admin/support-tickets/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
    setMsg(`Ticket marked ${status}`);
    load();
  }

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((r) => r.status === 'OPEN').length,
      inProgress: rows.filter((r) => r.status === 'IN_PROGRESS').length,
      resolved: rows.filter((r) => r.status === 'RESOLVED').length,
      closed: rows.filter((r) => r.status === 'CLOSED').length,
      urgentHigh: rows.filter((r) => r.priority === 'URGENT' || r.priority === 'HIGH').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== 'ALL' && r.status !== tab) return false;
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.subject} ${r.body} ${r.requesterEmail || ''} ${r.requesterName || ''}`
        .toLowerCase()
        .includes(s);
    });
  }, [rows, q, tab, priorityFilter]);

  const { page, pageSize, setPage, setPageSize, pageRows, total } = useAdminPagination(filtered, [
    q,
    tab,
    priorityFilter,
  ]);

  const statusDonut = useMemo(
    () =>
      (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)
        .map((st) => ({
          name: st.replace('_', ' '),
          value: rows.filter((r) => r.status === st).length,
          color: STATUS_COLORS[st],
        }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const priorityDonut = useMemo(
    () =>
      (['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const)
        .map((p) => ({
          name: p,
          value: rows.filter((r) => r.priority === p).length,
          color: PRIORITY_COLORS[p],
        }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const insight = useMemo(() => {
    if (!rows.length) return 'No support tickets yet. Create one to track merchant or customer escalations.';
    if (counts.open > 5) {
      return `${counts.open} open tickets need attention. Prioritize URGENT and HIGH items first.`;
    }
    if (counts.urgentHigh > 0) {
      return `${counts.urgentHigh} urgent/high priority ticket${counts.urgentHigh > 1 ? 's' : ''} in the queue.`;
    }
    return `${counts.resolved} tickets resolved. Queue is manageable with ${counts.open} open.`;
  }, [rows, counts]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.all },
    { id: 'OPEN', label: 'Open', count: counts.open },
    { id: 'IN_PROGRESS', label: 'In progress', count: counts.inProgress },
    { id: 'RESOLVED', label: 'Resolved', count: counts.resolved },
    { id: 'CLOSED', label: 'Closed', count: counts.closed },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <AdminPageHeader
        title="Support Tickets"
        subtitle="Help requests from merchants and customers."
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.28)]"
          >
            + Create Ticket
          </button>
        }
      />

      <AdminError message={error} />
      <AdminSuccess message={msg} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Tickets"
          value={num(rows.length)}
          trend={trendFromDates(rows.map((r) => r.createdAt))}
          icon={ICONS.ticket}
        />
        <AdminStatCard
          label="Open"
          value={num(counts.open)}
          trend={trendFromDates(rows.filter((r) => r.status === 'OPEN').map((r) => r.createdAt))}
          iconBg="bg-sky-50 text-sky-600"
          icon={ICONS.alert}
        />
        <AdminStatCard
          label="In progress"
          value={num(counts.inProgress)}
          iconBg="bg-violet-50 text-violet-600"
          icon={ICONS.activity}
        />
        <AdminStatCard
          label="Urgent / High"
          value={num(counts.urgentHigh)}
          invertTrend
          trend={trendFromDates(
            rows.filter((r) => r.priority === 'URGENT' || r.priority === 'HIGH').map((r) => r.createdAt),
          )}
          iconBg="bg-orange-50 text-orange-600"
          icon={ICONS.alert}
        />
        <AdminStatCard
          label="Resolved"
          value={num(counts.resolved)}
          iconBg="bg-emerald-50 text-emerald-600"
          icon={ICONS.check}
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
                  placeholder="Search subject, requester…"
                />
                <AdminSelect value={priorityFilter} onChange={setPriorityFilter}>
                  <option value="ALL">All priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                </AdminSelect>
              </AdminToolbar>

              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8F8FA] text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Requester</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((t) => (
                      <tr key={t.id} className="border-t border-black/5 hover:bg-[#FFF8F7]/70">
                        <td className="px-4 py-2.5">
                          <div className="font-bold">{t.subject}</div>
                          <div className="mt-0.5 max-w-xs truncate text-xs text-[#8E8E93]">{t.body}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold">{t.requesterName || 'Unknown'}</div>
                          <div className="text-xs text-[#8E8E93]">{t.requesterEmail || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={t.priority} />
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[#8E8E93]">
                          {fmtDate(t.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={t.status === st}
                                onClick={() => setStatus(t.id, st)}
                                className="rounded-lg border border-black/8 bg-white px-2 py-1 text-[10px] font-bold disabled:opacity-40"
                              >
                                {st.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length && (
                      <tr>
                        <td colSpan={6}>
                          <AdminEmpty message="No tickets match these filters." />
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
              title="By status"
              centerValue={num(rows.length)}
              centerLabel="Tickets"
              data={statusDonut}
            />
            <AdminDonutCard
              title="By priority"
              centerValue={num(counts.urgentHigh)}
              centerLabel="Urgent+High"
              data={priorityDonut}
            />
            <AdminInsightCard title="Support insight" message={insight} />
          </>
        }
      />

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createTicket}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Create Ticket</h2>
              <button type="button" className="text-[#8E8E93]" onClick={() => setCreateOpen(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Subject</span>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  placeholder="Brief summary of the issue"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Description</span>
                <textarea
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                  placeholder="Describe the issue in detail"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold"
                >
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-black/8 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
