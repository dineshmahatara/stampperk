'use client';

import { useMemo, useState } from 'react';
import { prefetchGoogleIdentityServices, requestGoogleIdToken } from '@/lib/googleAuth';

function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === 'exp:' || u.protocol === 'exps:') return true;
    if (u.protocol === 'stampperk:') return true;
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      const host = u.hostname;
      return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    }
    return false;
  } catch {
    return /^(exp|exps|stampperk):/i.test(uri);
  }
}

function appendIdToken(redirectUri: string, idToken: string): string {
  const join = redirectUri.includes('?') ? '&' : '?';
  return `${redirectUri}${join}id_token=${encodeURIComponent(idToken)}`;
}

export default function GoogleBridgePage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const redirectUri = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('redirect_uri') || '';
  }, []);

  async function continueWithGoogle() {
    setError('');
    if (!clientId) {
      setError('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID on web.');
      return;
    }
    if (!redirectUri || !isAllowedRedirect(redirectUri)) {
      setError('Invalid redirect URI for mobile Google sign-in.');
      return;
    }

    setBusy(true);
    try {
      prefetchGoogleIdentityServices();
      const idToken = await requestGoogleIdToken(clientId);
      window.location.href = appendIdToken(redirectUri, idToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-6 text-center">
      <p className="text-lg font-semibold text-[#1C1C1E]">Stamp Perk</p>
      <p className="mt-2 max-w-sm text-sm text-[#8E8E93]">
        Sign in with Google, then we&apos;ll return you to the app.
      </p>
      {error ? <p className="mt-3 max-w-sm text-sm text-[#FF5A5F]">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !clientId || !redirectUri}
        onClick={() => void continueWithGoogle()}
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#FF5A5F] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Continue with Google'}
      </button>
    </main>
  );
}
