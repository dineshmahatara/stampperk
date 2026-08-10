import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="p-10 text-center text-sm text-[#8E8E93]">Loading…</main>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
