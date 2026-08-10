'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type SessionRow = {
  id: string;
  deviceName?: string | null;
  deviceType?: string | null;
  ip?: string | null;
  suspicious?: boolean;
  lastSeenAt: string;
  createdAt: string;
  current?: boolean;
};

type LoginRow = {
  id: string;
  success: boolean;
  reason?: string | null;
  ip?: string | null;
  deviceName?: string | null;
  suspicious?: boolean;
  captchaUsed?: boolean;
  createdAt: string;
};

export function SecurityPanel() {
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [history, setHistory] = useState<LoginRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, h] = await Promise.all([
        api<SessionRow[]>('/auth/sessions', { token }),
        api<LoginRow[]>('/auth/login-history', { token }),
      ]);
      setSessions(s);
      setHistory(h);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load security data');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    if (!token) return;
    setBusy(true);
    try {
      await api(`/auth/sessions/${id}`, { method: 'DELETE', token });
      setMsg('Session revoked');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke');
    } finally {
      setBusy(false);
    }
  }

  async function logoutAll() {
    if (!token) return;
    setBusy(true);
    try {
      await api('/auth/logout-all', {
        method: 'POST',
        token,
        body: JSON.stringify({ keepCurrent: true }),
      });
      setMsg('Logged out from all other devices');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not logout all');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">Security &amp; devices</h2>
        <p className="mt-1 text-sm text-[#8E8E93]">
          Manage active sessions, review login history, and sign out everywhere else.
        </p>
      </div>

      {!!error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {!!msg && <p className="text-sm font-semibold text-emerald-700">{msg}</p>}

      <div className="rounded-2xl border border-black/8 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold">Active sessions</h3>
          <button
            type="button"
            disabled={busy}
            onClick={() => void logoutAll()}
            className="rounded-full bg-[#FF5A5F] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            Logout from all devices
          </button>
        </div>
        <ul className="space-y-2">
          {!sessions.length && (
            <li className="text-sm text-[#8E8E93]">No active sessions listed.</li>
          )}
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-[#FAFAFA] px-3 py-2"
            >
              <div>
                <div className="text-sm font-bold">
                  {s.deviceName || 'Device'} {s.current ? '(this device)' : ''}
                </div>
                <div className="text-xs text-[#8E8E93]">
                  {s.ip || 'IP unknown'} · last seen {new Date(s.lastSeenAt).toLocaleString()}
                  {s.suspicious ? ' · flagged' : ''}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  className="text-xs font-bold text-[#FF5A5F]"
                  onClick={() => void revoke(s.id)}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white p-4">
        <h3 className="mb-3 font-extrabold">Login history</h3>
        <ul className="max-h-80 space-y-2 overflow-auto">
          {!history.length && <li className="text-sm text-[#8E8E93]">No login events yet.</li>}
          {history.map((h) => (
            <li key={h.id} className="rounded-xl border border-black/5 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className={`font-bold ${h.success ? 'text-emerald-700' : 'text-red-600'}`}>
                  {h.success ? 'Success' : 'Failed'}
                </span>
                <span className="text-xs text-[#8E8E93]">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-[#8E8E93]">
                {[h.deviceName, h.ip, h.reason, h.suspicious ? 'suspicious' : '', h.captchaUsed ? 'captcha' : '']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="text-sm font-bold text-[#8E8E93] underline"
        onClick={() => logout()}
      >
        Sign out this device
      </button>
    </div>
  );
}
