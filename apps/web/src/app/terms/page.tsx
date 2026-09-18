import Link from 'next/link';
import { fetchBranding } from '@/lib/branding';

export default async function TermsPage() {
  const branding = await fetchBranding();
  const companyName = branding.companyName || 'Stamp Perk';

  return (
    <main className="prose mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="font-extrabold text-[#e8455a] no-underline">
        {companyName}
      </Link>
      <h1>Terms of Use</h1>
      <p>
        By using {companyName} you agree to create accurate business information, honor published
        rewards, and not abuse QR scanning or offline sync. Subscriptions renew until cancelled.
        Restore purchases are available on mobile app stores.
      </p>
    </main>
  );
}
