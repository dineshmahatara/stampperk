'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureReferralFromSearch, saveReferral } from '@/lib/referral';

/** Reads ?ref= from the URL and stores attribution for register/claim. */
export function ReferralCapture({
  merchantId,
  merchantSlug,
}: {
  merchantId?: string;
  merchantSlug?: string;
}) {
  const search = useSearchParams();

  useEffect(() => {
    const captured = captureReferralFromSearch(search);
    if (!captured) return;
    if (merchantId || merchantSlug) {
      saveReferral({
        ...captured,
        referralMerchantId: captured.referralMerchantId || merchantId,
        merchantSlug: merchantSlug || captured.merchantSlug,
      });
    }
  }, [search, merchantId, merchantSlug]);

  return null;
}
