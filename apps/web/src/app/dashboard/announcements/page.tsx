'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';

type Announcement = {
  id: string;
  title: string;
  body: string;
  segment: string;
  status: string;
  sentCount: number;
  publishedAt: string | null;
  createdAt: string;
  createdBy?: { name: string | null; email: string } | null;
};

const SEGMENTS = [
  { value: 'ALL', label: 'All enrolled' },
  { value: 'NEW', label: 'New' },
  { value: 'RETURNING', label: 'Returning' },
  { value: 'VIP', label: 'VIP' },
  { value: 'AT_RISK', label: 'At risk' },
] as const;

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]['value']>('ALL');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    api<Announcement[]>('/notifications/merchant/announcements', { token })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [token]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.segment.toLowerCase().includes(q),
    );
  }, [items, search]);

  async function submit(publish: boolean) {
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api('/notifications/merchant/announcements', {
        method: 'POST',
        token,
        body: JSON.stringify({ title, body, segment, publish }),
      });
      setCreating(false);
      setTitle('');
      setBody('');
      setSegment('ALL');
      setMsg(publish ? 'Announcement sent to customers' : 'Draft saved');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft(id: string) {
    if (!token) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api(`/notifications/merchant/announcements/${id}/publish`, {
        method: 'POST',
        token,
      });
      setMsg('Announcement published');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="mx-auto max-w-[640px]">
        <MerchantPageHeader
          title="New announcement"
          subtitle="Broadcast an in-app message to enrolled loyalty customers."
          action={
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold"
            >
              Cancel
            </button>
          }
        />
        {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
        <MerchantSurface>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Title
            </span>
            <input
              className="w-full rounded-xl border border-black/8 px-3 py-2.5 text-sm"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekend hours update"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Message
            </span>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-black/8 px-3 py-2.5 text-sm"
              maxLength={500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell your customers what’s new…"
            />
          </label>
          <label className="mb-5 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              Audience
            </span>
            <select
              className="w-full rounded-xl border border-black/8 px-3 py-2.5 text-sm"
              value={segment}
              onChange={(e) => setSegment(e.target.value as typeof segment)}
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void submit(true)}
              className="rounded-full bg-[#FF5A5F] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Send now
            </button>
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void submit(false)}
              className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              Save draft
            </button>
          </div>
        </MerchantSurface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <MerchantPageHeader
        title="Announcements"
        subtitle="Broadcast messages to your enrolled customers."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!filtered.length ? (
        <MerchantSurface>
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE8EA] text-xl text-[#FF5A5F]">
              ✎
            </div>
            <div className="text-lg font-extrabold">No announcements yet</div>
            <p className="mt-1 text-sm text-[#8E8E93]">
              Create a broadcast for all enrolled customers or a CRM segment.
            </p>
          </div>
        </MerchantSurface>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <MerchantSurface key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFF1F2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF5A5F]">
                      {a.segment.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[#8E8E93]">
                      {new Date(a.publishedAt || a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 font-extrabold">{a.title}</div>
                  <div className="text-sm text-[#8E8E93]">{a.body}</div>
                  <div className="mt-2 text-xs text-[#8E8E93]">
                    {a.status === 'SENT' ? `Delivered to ${a.sentCount}` : 'Draft'}
                    {a.createdBy?.name ? ` · ${a.createdBy.name}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      a.status === 'SENT'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {a.status}
                  </span>
                  {a.status === 'DRAFT' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void publishDraft(a.id)}
                      className="rounded-full bg-[#FF5A5F] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            </MerchantSurface>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 mt-6">
        <button
          type="button"
          onClick={() => {
            setMsg('');
            setError('');
            setCreating(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A5F] py-3.5 text-sm font-bold text-white shadow-lg"
        >
          New announcement
        </button>
      </div>
    </div>
  );
}
