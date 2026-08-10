'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clearReferral, readReferral } from '@/lib/referral';

/** Claims a stored merchant/platform referral for the logged-in customer. */
export function ReferralClaimOnAuth() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const stored = readReferral();
    if (!stored?.referralCode) return;
    api('/referrals/claim', {
      method: 'POST',
      token,
      body: JSON.stringify({
        referralCode: stored.referralCode,
        referralMerchantId: stored.referralMerchantId,
        referralProgramId: stored.referralProgramId,
      }),
    })
      .then(() => clearReferral())
      .catch(() => undefined);
  }, [token]);

  return null;
}
