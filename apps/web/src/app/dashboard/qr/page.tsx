'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type QrPayload = {
  userId: string;
  name: string;
  qrPayload: string;
  qrToken: string;
};

export default function MyQrPage() {
  const { token } = useAuth();
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<QrPayload>('/qr/me', { token })
      .then(setQr)
      .catch((e) => setError(e.message));
  }, [token]);

  const imgSrc = qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qr.qrPayload)}`
    : '';

  async function copyCode() {
    if (!qr?.qrToken) return;
    try {
      await navigator.clipboard.writeText(qr.qrToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My QR</h1>
      <p className="mt-1 text-sm text-[#8E8E93]">Show this code at the counter to collect stamps</p>
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      {qr && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-black/5 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt="Customer QR" width={240} height={240} className="rounded-xl" />
          <p className="mt-5 text-lg font-extrabold">{qr.name}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E8E93]">
            Member ID
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-2 rounded-xl bg-[#F8F8FA] px-5 py-2.5 font-mono text-2xl font-black tracking-[0.2em] text-[#FF5A5F] hover:bg-[#FFF1F3]"
            title="Copy member ID"
          >
            {qr.qrToken}
          </button>
          <p className="mt-2 text-xs text-[#8E8E93]">
            {copied ? 'Copied!' : 'Tap to copy · merchants can also type this code'}
          </p>
        </div>
      )}
    </div>
  );
}
