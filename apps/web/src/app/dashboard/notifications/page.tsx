'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MerchantPageHeader, MerchantSurface } from '@/components/MerchantPage';
import { PushSendWizard } from '@/components/PushSendWizard';

type PushSend = {
  id: string;
  contentType: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  estimatedCount: number;
  sentCount: number;
  createdAt: string;
  program?: { title: string } | null;
  campaign?: { title: string } | null;
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const [sends, setSends] = useState<PushSend[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    api<PushSend[]>('/notifications/merchant/sends', { token })
      .then(setSends)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }

  useEffect(load, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sends;
    return sends.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.contentType.toLowerCase().includes(q),
    );
  }, [sends, search]);

  if (creating) {
    return (
      <PushSendWizard
        onCancel={() => setCreating(false)}
        onDone={() => {
          setCreating(false);
          setMsg('Message sent');
          load();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <MerchantPageHeader
        title="Messages"
        subtitle="View, manage and track all your app notification sends."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!filtered.length ? (
        <MerchantSurface>
          <div className="py-12 text-center">
            <div className="mb-3 text-5xl opacity-40">✉️</div>
            <div className="text-lg font-extrabold">No messages yet</div>
            <p className="mt-1 text-sm text-[#8E8E93]">
              Create your first app notification to see real delivery status here.
            </p>
          </div>
        </MerchantSurface>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <MerchantSurface key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#FFF1F2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#FF5A5F]">
                      {s.contentType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[#8E8E93]">{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 font-extrabold">{s.title}</div>
                  <div className="text-sm text-[#8E8E93]">{s.body}</div>
                  <div className="mt-2 text-xs text-[#8E8E93]">
                    {s.audience.replace(/_/g, ' ')} · sent {s.sentCount}/{s.estimatedCount}
                    {s.program?.title ? ` · ${s.program.title}` : ''}
                    {s.campaign?.title ? ` · ${s.campaign.title}` : ''}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {s.status}
                </span>
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
            setCreating(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A5F] py-3.5 text-sm font-bold text-white shadow-lg"
        >
          ✈ Create New Message +
        </button>
      </div>
    </div>
  );
}
