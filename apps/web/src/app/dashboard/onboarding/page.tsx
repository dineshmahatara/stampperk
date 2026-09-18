'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { merchantEssentialsReady } from '@stampperk/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoyaltyCardWizard } from '@/components/LoyaltyCardWizard';
import {
  BusinessEssentialsForm,
  type EssentialsMerchant,
} from '@/components/BusinessEssentialsForm';

type Phase = 'loading' | 'essentials' | 'card';

export default function OnboardingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [merchant, setMerchant] = useState<EssentialsMerchant | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [m, programs] = await Promise.all([
          api<EssentialsMerchant>('/merchants/me', { token }).catch(() => null),
          api<{ id: string }[]>('/loyalty/programs', { token }).catch(() => []),
        ]);
        if (cancelled) return;
        if (m && merchantEssentialsReady(m) && programs.length > 0) {
          router.replace('/dashboard');
          return;
        }
        setMerchant(m);
        setPhase(m && merchantEssentialsReady(m) ? 'card' : 'essentials');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load onboarding');
          setPhase('essentials');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-white p-8 text-sm font-semibold text-[#8E8E93]">
        Preparing onboarding…
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] rounded-3xl bg-white p-4 sm:p-8">
      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

      {phase === 'essentials' && (
        <BusinessEssentialsForm
          initial={merchant}
          onSaved={(m) => {
            setMerchant(m);
            setPhase('card');
          }}
        />
      )}

      {phase === 'card' && (
        <div>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#FF5A5F]">Step 2 of 2</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1C1C1E]">
              Create your first stamp card
            </h1>
            <p className="mt-2 text-sm text-[#8E8E93]">
              Profile ready for {merchant?.businessName || 'your business'}. Design the loyalty card
              customers will collect.
            </p>
          </div>
          <LoyaltyCardWizard
            mode="create-card"
            defaults={{
              businessName: merchant?.businessName,
              logoUrl: merchant?.logoUrl || undefined,
            }}
            onComplete={async ({ program }) => {
              if (!token) throw new Error('Not signed in');
              await api('/loyalty/programs', {
                method: 'POST',
                token,
                body: JSON.stringify(program),
              });
            }}
            onDone={() => router.push('/dashboard')}
            onCancel={() => router.push('/dashboard/profile')}
          />
        </div>
      )}
    </div>
  );
}
