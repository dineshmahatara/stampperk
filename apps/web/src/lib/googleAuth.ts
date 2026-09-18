'use client';

import { useEffect, useRef } from 'react';

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
  }) => void;
  prompt: (
    momentListener?: (notification: {
      isNotDisplayed: () => boolean;
      isSkippedMoment: () => boolean;
    }) => void,
  ) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      width?: number | string;
      text?: string;
      locale?: string;
      shape?: string;
      logo_alignment?: string;
    },
  ) => void;
  cancel: () => void;
  disableAutoSelect?: () => void;
};

type GisWindow = Window & {
  google?: {
    accounts?: { id: GoogleAccountsId };
  };
};

let gisLoadPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  const w = window as GisWindow;
  if (w.google?.accounts?.id) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const done = () => {
      if (w.google?.accounts?.id) resolve();
      else reject(new Error('Google Identity unavailable'));
    };
    const fail = () => {
      gisLoadPromise = null;
      reject(new Error('Google Identity failed to load'));
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-stampperk-gis="1"]');
    if (existing) {
      // Script tag may already be loaded — `load` will not fire again.
      if (w.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', done);
      existing.addEventListener('error', fail);
      // If the script finished before we attached listeners, poll briefly.
      const started = Date.now();
      const poll = window.setInterval(() => {
        if (w.google?.accounts?.id) {
          window.clearInterval(poll);
          resolve();
        } else if (Date.now() - started > 8_000) {
          window.clearInterval(poll);
          fail();
        }
      }, 50);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.stampperkGis = '1';
    script.onload = done;
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/** Warm the GIS script so the first click opens the account picker faster. */
export function prefetchGoogleIdentityServices(): void {
  if (typeof window === 'undefined') return;
  void loadGoogleIdentityServices().catch(() => undefined);
}

/**
 * Smaran Buti–style Google button: official GIS button with popup account chooser.
 * Renders into `host` and calls `onCredential` with the ID token JWT.
 */
export async function mountGoogleContinueButton(
  host: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void | Promise<void>,
  onError?: (message: string) => void,
): Promise<() => void> {
  if (!clientId) {
    host.innerHTML =
      '<p class="text-center text-xs text-[#8E8E93]">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.</p>';
    return () => {
      host.innerHTML = '';
    };
  }

  await loadGoogleIdentityServices();
  const w = window as GisWindow;
  const gis = w.google?.accounts?.id;
  if (!gis) {
    onError?.('Google Identity unavailable');
    return () => {
      host.innerHTML = '';
    };
  }

  gis.disableAutoSelect?.();
  gis.initialize({
    client_id: clientId,
    callback: (response) => {
      if (!response?.credential) {
        onError?.('Google did not return a credential');
        return;
      }
      void Promise.resolve(onCredential(response.credential)).catch((e) =>
        onError?.(e instanceof Error ? e.message : 'Google sign-in failed'),
      );
    },
    // Popup opens Google’s account picker (same pattern as Smaran Buti admin login).
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    context: 'signin',
    itp_support: true,
  });

  host.innerHTML = '';
  const width = Math.min(400, Math.max(240, host.clientWidth || host.parentElement?.clientWidth || 320));
  gis.renderButton(host, {
    theme: 'outline',
    size: 'large',
    width,
    text: 'continue_with',
    locale: 'en',
    shape: 'rectangular',
    logo_alignment: 'left',
  });

  return () => {
    host.innerHTML = '';
  };
}

/** Hook: mount Google Continue button that opens the Google account chooser popup. */
export function useGoogleContinueButton(
  clientId: string | undefined,
  onCredential: (idToken: string) => void | Promise<void>,
  onError?: (message: string) => void,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !clientId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void mountGoogleContinueButton(
      host,
      clientId,
      (token) => onCredentialRef.current(token),
      (msg) => onErrorRef.current?.(msg),
    ).then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [clientId]);

  return hostRef;
}

/**
 * Compatibility helper: opens the Google account-chooser popup and returns an ID token.
 * Prefer `useGoogleContinueButton` on login screens (Smaran Buti style).
 */
export async function requestGoogleIdToken(clientId: string): Promise<string> {
  if (!clientId) throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  await loadGoogleIdentityServices();
  const w = window as GisWindow;
  const gis = w.google?.accounts?.id;
  if (!gis) throw new Error('Google Identity unavailable');

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    gis.disableAutoSelect?.();
    gis.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      callback: (response) => {
        if (!response?.credential) {
          finish(() => reject(new Error('Google did not return a credential')));
          return;
        }
        finish(() => resolve(response.credential));
      },
    });

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    document.body.appendChild(host);
    try {
      gis.renderButton(host, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'continue_with',
      });
      const btn = host.querySelector('div[role="button"]') as HTMLElement | null;
      if (btn) btn.click();
      else finish(() => reject(new Error('Google sign-in UI failed to open')));
    } catch (e) {
      finish(() => reject(e instanceof Error ? e : new Error('Google sign-in unavailable')));
    } finally {
      setTimeout(() => host.remove(), 3000);
    }

    setTimeout(() => {
      finish(() => reject(new Error('Google sign-in timed out. Try again.')));
    }, 120_000);
  });
}
