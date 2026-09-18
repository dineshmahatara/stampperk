'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ScanPage() {
  const { token } = useAuth();
  const [qr, setQr] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [result, setResult] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; title: string }>>([]);
  const [programId, setProgramId] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Array<{ id: string; title: string }>>('/loyalty/programs', { token })
      .then((p) => {
        setPrograms(p);
        if (p[0]) setProgramId(p[0].id);
      })
      .catch(() => undefined);
  }, [token]);

  function validateQr() {
    const trimmed = qr.trim();
    if (!trimmed) {
      setOk(false);
      setResult('Paste or scan a customer QR first');
      return null;
    }
    const tokenOnly = trimmed.replace(/^(stampperk|stampz):customer:/i, '').trim();
    if (tokenOnly.length < 8) {
      setOk(false);
      setResult('Customer QR looks incomplete. Use stampperk:customer:… from the customer app.');
      return null;
    }
    return trimmed;
  }

  async function scan() {
    if (!token) return;
    const customerQrToken = validateQr();
    if (!customerQrToken) return;
    if (!programId && programs.length) {
      setOk(false);
      setResult('Select a loyalty program');
      return;
    }
    setBusy(true);
    setResult('');
    try {
      const res = await api<{
        rewardUnlocked: boolean;
        card: {
          stampCount: number;
          availableRewards: number;
          program: { totalStamps: number; rewardTitle: string };
        };
      }>('/qr/scan', {
        method: 'POST',
        token,
        body: JSON.stringify({
          customerQrToken,
          programId: programId || undefined,
          saleAmount: saleAmount ? Number(saleAmount) : undefined,
        }),
      });
      setOk(true);
      setResult(
        res.rewardUnlocked
          ? `Reward unlocked: ${res.card.program.rewardTitle}`
          : `Stamp added. Progress ${res.card.stampCount}/${res.card.program.totalStamps}`,
      );
    } catch (e) {
      setOk(false);
      setResult(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  async function syncOfflineDemo() {
    if (!token) return;
    const customerQrToken = validateQr();
    if (!customerQrToken) return;
    const offlineId = `offline-${Date.now()}`;
    setBusy(true);
    setResult('');
    try {
      const res = await api<{ synced: number }>('/qr/sync-offline', {
        method: 'POST',
        token,
        body: JSON.stringify({
          scans: [
            {
              customerQrToken,
              programId: programId || undefined,
              offlineId,
              scannedAt: new Date().toISOString(),
            },
          ],
        }),
      });
      setOk(true);
      setResult(`Offline sync complete: ${res.synced} scan(s)`);
    } catch (e) {
      setOk(false);
      setResult(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-3xl font-bold">Scan customer QR</h1>
      <p className="mb-6 text-[#6b7280]">Paste customer QR token or stampperk:customer:… payload</p>
      <div className="card space-y-4 p-6">
        <label className="block text-sm font-medium">
          Program
          <select
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            {!programs.length && <option value="">No programs yet</option>}
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Customer QR
          <textarea
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            rows={3}
            value={qr}
            onChange={(e) => setQr(e.target.value)}
            placeholder="stampperk:customer:…"
          />
        </label>
        <label className="block text-sm font-medium">
          Sale amount (optional)
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            type="number"
            min={0}
            step="0.01"
          />
        </label>
        <button className="btn-primary w-full disabled:opacity-50" onClick={scan} disabled={busy}>
          {busy ? 'Working…' : 'Give stamp'}
        </button>
        <button
          className="w-full rounded-full border border-[#e8455a] px-4 py-3 font-semibold text-[#e8455a] disabled:opacity-50"
          onClick={syncOfflineDemo}
          disabled={busy}
        >
          Sync as offline scan
        </button>
        {result && (
          <p
            className={`rounded-xl p-3 text-sm font-medium ${
              ok ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#fff1f3] text-[#e8455a]'
            }`}
          >
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
