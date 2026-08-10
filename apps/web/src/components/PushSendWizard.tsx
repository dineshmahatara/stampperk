'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type ContentType = 'GENERAL' | 'LOYALTY_CARD' | 'OFFER';
type Audience = 'LOYALTY_CUSTOMERS' | 'NEAR_AREA' | 'CUSTOMERS_AND_OUTSIDE';

type Program = {
  id: string;
  title: string;
  rewardTitle: string;
  rewardDescription?: string | null;
  logoUrl?: string | null;
  stampColor?: string | null;
  active: boolean;
  businessName?: string | null;
};

type Campaign = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  status: string;
  imageUrl?: string | null;
};

type Estimate = { eligible: number; capped: number };

const STEPS = ['Type', 'Content', 'Compose', 'Audience', 'Review'] as const;

export function PushSendWizard({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const [phase, setPhase] = useState<'intro' | 'wizard'>('intro');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [programId, setProgramId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('LOYALTY_CUSTOMERS');
  const [radiusKm, setRadiusKm] = useState(5);
  const [estimate, setEstimate] = useState<Estimate>({ eligible: 0, capped: 0 });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState('');
  const [merchantName, setMerchantName] = useState('Your business');

  useEffect(() => {
    if (!token) return;
    api<Program[]>('/loyalty/programs', { token })
      .then((list) => setPrograms(list.filter((p) => p.active !== false)))
      .catch(() => undefined);
    api<{ campaigns: Campaign[] }>('/campaigns', { token })
      .then((res) => setCampaigns((res.campaigns || []).filter((c) => c.status === 'ACTIVE')))
      .catch(() => undefined);
    api<{ businessName?: string }>('/merchants/me', { token })
      .then((m) => setMerchantName(m.businessName || 'Your business'))
      .catch(() => undefined);
  }, [token]);

  const refreshEstimate = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<Estimate>('/notifications/merchant/estimate', {
        method: 'POST',
        token,
        body: JSON.stringify({ audience, radiusKm }),
      });
      setEstimate(res);
    } catch {
      setEstimate({ eligible: 0, capped: 0 });
    }
  }, [token, audience, radiusKm]);

  useEffect(() => {
    if (phase === 'wizard' && step === 3) refreshEstimate();
  }, [phase, step, refreshEstimate]);

  const selectedProgram = programs.find((p) => p.id === programId);
  const selectedCampaign = campaigns.filter((c) => c.status === 'ACTIVE').find((c) => c.id === campaignId);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => p.title.toLowerCase().includes(q) || p.rewardTitle.toLowerCase().includes(q));
  }, [programs, search]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = campaigns.filter((c) => c.status === 'ACTIVE');
    if (!q) return active;
    return active.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.badgeText.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  function pickType(type: ContentType) {
    setContentType(type);
    setProgramId('');
    setCampaignId('');
    setSearch('');
    if (type === 'GENERAL') {
      setTitle('');
      setBody('');
    }
  }

  function applyProgram(p: Program) {
    setProgramId(p.id);
    setTitle(p.title.slice(0, 60));
    setBody((p.rewardDescription || `Collect stamps and unlock ${p.rewardTitle}`).slice(0, 160));
  }

  function applyCampaign(c: Campaign) {
    setCampaignId(c.id);
    setTitle(c.title.slice(0, 60));
    setBody(c.description.slice(0, 160));
  }

  function canContinue() {
    if (step === 0) return Boolean(contentType);
    if (step === 1) {
      if (contentType === 'GENERAL') return true;
      if (contentType === 'LOYALTY_CARD') return Boolean(programId);
      if (contentType === 'OFFER') return Boolean(campaignId);
    }
    if (step === 2) return title.trim().length > 0 && body.trim().length > 0;
    if (step === 3) return Boolean(audience);
    if (step === 4) return estimate.eligible > 0;
    return false;
  }

  function next() {
    setError('');
    if (!canContinue()) {
      if (step === 4) setError('No customers match this audience.');
      else setError('Complete this step to continue');
      return;
    }
    // Skip content pick for general
    if (step === 0 && contentType === 'GENERAL') {
      setStep(2);
      return;
    }
    if (step < 4) setStep((s) => s + 1);
  }

  function back() {
    setError('');
    if (step === 2 && contentType === 'GENERAL') {
      setStep(0);
      return;
    }
    if (step === 0) {
      setPhase('intro');
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  async function confirmSend() {
    if (!token || !contentType) return;
    if (estimate.eligible <= 0) {
      setError('No customers match this audience.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/notifications/merchant/send', {
        method: 'POST',
        token,
        body: JSON.stringify({
          contentType,
          title: title.trim(),
          body: body.trim(),
          programId: contentType === 'LOYALTY_CARD' ? programId : undefined,
          campaignId: contentType === 'OFFER' ? campaignId : undefined,
          audience,
          radiusKm,
        }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button type="button" onClick={onCancel} className="text-sm font-bold text-[#FF5A5F]">
          ← Back
        </button>
        <div className="rounded-3xl border border-black/5 bg-gradient-to-br from-[#FFF5F6] to-white p-6 shadow-sm">
          <div className="mb-4 text-5xl">📣</div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Reach customers and <span className="text-[#FF5A5F]">bring them back</span>
          </h1>
          <p className="mt-2 text-sm text-[#8E8E93]">
            Send offers, loyalty cards, or custom messages instantly with free app notifications.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['Promote existing content', 'Send offers or loyalty cards without creating again.'],
              ['Choose your channel', 'Free app notifications delivered in Stampza.'],
              ['Select audience and send', 'Pick the right customers, review and send.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="text-sm font-extrabold">{t}</div>
                <div className="mt-1 text-xs text-[#8E8E93]">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-xs text-[#8E8E93]">
            <span className="font-bold text-[#FF5A5F]">🔔 App Notification FREE</span>
            Instant delivery in the Stampza app.
          </div>
          <button
            type="button"
            onClick={() => setPhase('wizard')}
            className="mt-6 w-full rounded-full bg-[#FF5A5F] py-3.5 text-sm font-bold text-white"
          >
            Start Sending →
          </button>
          <p className="mt-2 text-center text-[11px] text-[#8E8E93]">You will review everything before sending.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-[#FF5A5F]">
          ←
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            // visual step index for general skip
            const visualDone = i < step || (contentType === 'GENERAL' && i === 1 && step >= 2);
            const active = i === step || (contentType === 'GENERAL' && i === 1 && step === 2 ? false : i === step);
            return (
              <div
                key={label}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  visualDone && i !== step
                    ? 'bg-[#FF5A5F] text-white'
                    : active
                      ? 'bg-[#FF5A5F] text-white'
                      : 'bg-[#E5E5EA] text-[#8E8E93]'
                }`}
                title={label}
              >
                {visualDone && i !== step ? '✓' : i + 1}
              </div>
            );
          })}
        </div>
        <div className="w-10" />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {step === 0 && (
        <div className="space-y-4">
          <h1 className="text-center text-2xl font-extrabold">
            What do you want to <span className="text-[#FF5A5F]">send?</span>
          </h1>
          <p className="text-center text-sm text-[#8E8E93]">Choose the type of message you want to send.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['OFFER', 'Send Offer', 'Share an existing offer with your customers.', '🏷️'],
                ['LOYALTY_CARD', 'Send Loyalty Card', 'Promote an existing loyalty card.', '🃏'],
                ['GENERAL', 'General Message', 'Send a custom message or announcement.', '💬'],
              ] as const
            ).map(([id, t, d, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => pickType(id)}
                className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                  contentType === id ? 'border-[#FF5A5F] ring-2 ring-[#FF5A5F]/20' : 'border-black/5'
                } ${id === 'GENERAL' ? 'sm:col-span-2 sm:mx-auto sm:w-1/2' : ''}`}
              >
                <div className="text-2xl">{icon}</div>
                <div className="mt-2 font-extrabold">{t}</div>
                <div className="mt-1 text-xs text-[#8E8E93]">{d}</div>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-black/5 bg-white px-3 py-2 text-center text-xs text-[#8E8E93]">
            Messages are delivered instantly with free app notifications.
          </div>
        </div>
      )}

      {step === 1 && contentType === 'LOYALTY_CARD' && (
        <div className="space-y-4">
          <h1 className="text-center text-2xl font-extrabold">Select Loyalty Card</h1>
          <p className="text-center text-sm text-[#8E8E93]">Choose an existing loyalty card to promote.</p>
          <input
            className="w-full rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm"
            placeholder="Search loyalty cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2">
            {filteredPrograms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyProgram(p)}
                className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left ${
                  programId === p.id ? 'border-[#FF5A5F] ring-2 ring-[#FF5A5F]/15' : 'border-black/5'
                }`}
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[10px] font-bold text-white"
                  style={{ background: p.stampColor || '#FF5A5F' }}
                >
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    'CARD'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{p.title}</div>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Active
                  </span>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    programId === p.id ? 'border-[#FF5A5F] bg-[#FF5A5F]' : 'border-black/20'
                  }`}
                />
              </button>
            ))}
            {!filteredPrograms.length && (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
                <div className="font-extrabold">No loyalty cards yet</div>
                <p className="mt-1 text-sm text-[#8E8E93]">Create a card from Loyalty Programs, then return here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && contentType === 'OFFER' && (
        <div className="space-y-4">
          <h1 className="text-center text-2xl font-extrabold">Select Offer</h1>
          <p className="text-center text-sm text-[#8E8E93]">Choose an existing offer to send.</p>
          <input
            className="w-full rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2">
            {filteredCampaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => applyCampaign(c)}
                className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left ${
                  campaignId === c.id ? 'border-[#FF5A5F] ring-2 ring-[#FF5A5F]/15' : 'border-black/5'
                }`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-xs font-extrabold text-[#FF5A5F]">
                  {c.badgeText || '%'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{c.title}</div>
                  <div className="truncate text-xs text-[#8E8E93]">{c.description}</div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    campaignId === c.id ? 'border-[#FF5A5F] bg-[#FF5A5F]' : 'border-black/20'
                  }`}
                />
              </button>
            ))}
            {!filteredCampaigns.length && (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
                <div className="mb-2 text-4xl">🖼️</div>
                <div className="font-extrabold">No current active offer</div>
                <p className="mt-1 text-sm text-[#8E8E93]">Publish or reactivate an offer from Campaigns, then return here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">Compose your message</h1>
          <p className="text-sm text-[#8E8E93]">Review and edit the message before choosing an audience.</p>
          <label className="block">
            <div className="mb-1 flex justify-between text-xs font-bold">
              <span>1. Message Title</span>
              <span className="text-[#8E8E93]">{title.length}/60</span>
            </div>
            <input
              className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <div className="mb-1 flex justify-between text-xs font-bold">
              <span>2. Write Your Message</span>
              <span className="text-[#8E8E93]">{body.length}/160</span>
            </div>
            <textarea
              className="min-h-[100px] w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm"
              maxLength={160}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div>
            <div className="mb-2 text-sm font-extrabold">Preview</div>
            <div className="flex gap-3 rounded-2xl border border-black/5 bg-[#FFF5F6] p-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
                style={{ background: selectedProgram?.stampColor || '#FF5A5F' }}
              >
                {contentType === 'OFFER' ? '🏷️' : contentType === 'LOYALTY_CARD' ? '🃏' : '💬'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#FF5A5F]">
                  {merchantName} · now
                </div>
                <div className="truncate font-extrabold">{title || 'Title'}</div>
                <div className="truncate text-sm text-[#8E8E93]">{body || 'Message body'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">
            Who will receive this <span className="text-[#FF5A5F]">message?</span>
          </h1>
          <p className="text-sm text-[#8E8E93]">Choose an audience, map center, and radius.</p>
          {(
            [
              ['LOYALTY_CUSTOMERS', 'Only Your Customers', 'Everyone with one of your loyalty cards.', '👥'],
              ['NEAR_AREA', 'People Near This Area', 'Eligible app users inside the selected radius.', '📍'],
              ['CUSTOMERS_AND_OUTSIDE', 'Customers + People Nearby', 'A deduplicated union, including customers outside the radius.', '🗣️'],
            ] as const
          ).map(([id, t, d, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAudience(id)}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left ${
                audience === id ? 'border-[#FF5A5F] ring-2 ring-[#FF5A5F]/15' : 'border-black/5'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">{t}</div>
                <div className="text-xs text-[#8E8E93]">{d}</div>
              </div>
              <div className="text-xs font-bold text-[#8E8E93]">
                {audience === id ? estimate.eligible : '—'} Eligible
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  audience === id ? 'border-[#FF5A5F] bg-[#FF5A5F]' : 'border-black/20'
                }`}
              />
            </button>
          ))}
          {(audience === 'NEAR_AREA' || audience === 'CUSTOMERS_AND_OUTSIDE') && (
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-[#8E8E93]">Radius (km)</span>
              <input
                type="number"
                min={0.5}
                max={100}
                step={0.5}
                className="w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value) || 5)}
              />
            </label>
          )}
          <div className="rounded-2xl bg-[#FFF1F2] px-4 py-3 text-sm font-semibold text-[#FF5A5F]">
            {estimate.eligible} estimated sendable · {estimate.capped} currently capped
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold">
            Review and <span className="text-[#FF5A5F]">confirm</span>
          </h1>
          <p className="text-sm text-[#8E8E93]">Check everything before sending your message.</p>
          <div className="rounded-2xl border border-black/5 bg-[#FFF5F6] p-4">
            <div className="text-[11px] font-bold text-[#FF5A5F]">{merchantName} · now</div>
            <div className="mt-2 font-extrabold">{title}</div>
            <div className="text-sm text-[#8E8E93]">{body}</div>
          </div>
          <div className="space-y-2 rounded-2xl border border-black/5 bg-white p-4 text-sm">
            {[
              ['Content', contentType === 'OFFER' ? 'Offer' : contentType === 'LOYALTY_CARD' ? 'Loyalty Card' : 'General Message'],
              ['Audience', audience === 'LOYALTY_CUSTOMERS' ? 'Only your customers' : audience === 'NEAR_AREA' ? 'People near this area' : 'Customers + people nearby'],
              ['Area Radius', audience === 'LOYALTY_CUSTOMERS' ? 'Not required' : `${radiusKm} km`],
              ['Recipients', `${estimate.eligible} estimated sendable`],
              ['Channel', 'App Notification'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-black/5 py-2 last:border-0">
                <span className="text-[#8E8E93]">{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
          </div>
          {estimate.eligible <= 0 && (
            <p className="text-sm font-semibold text-red-600">No customers match this audience.</p>
          )}
        </div>
      )}

      <div className="sticky bottom-0 bg-[#F4F5F7] pb-2 pt-2">
        {step < 4 ? (
          <button
            type="button"
            disabled={!canContinue()}
            onClick={next}
            className="w-full rounded-full bg-[#FF5A5F] py-3.5 text-sm font-bold text-white disabled:bg-[#FFC4C6]"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || estimate.eligible <= 0}
            onClick={confirmSend}
            className="w-full rounded-full bg-[#FF5A5F] py-3.5 text-sm font-bold text-white disabled:bg-[#FFC4C6]"
          >
            {busy ? 'Sending…' : 'Confirm & Send ✈'}
          </button>
        )}
      </div>
    </div>
  );
}
