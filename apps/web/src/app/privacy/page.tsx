import Link from 'next/link';
import { fetchBranding } from '@/lib/branding';

export default async function PrivacyPage() {
  const branding = await fetchBranding();
  const companyName = branding.companyName || 'Stampz';

  return (
    <main className="prose mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="font-extrabold text-[#e8455a] no-underline">
        {companyName}
      </Link>
      <h1>Privacy Policy</h1>
      <p>
        {companyName} processes account, loyalty, and business data to provide digital stamp cards
        worldwide. Customers can export their data (`POST /api/privacy/export`) and request deletion
        (`DELETE /api/privacy/account`).
      </p>
      <p>
        We support marketing and push consent flags, JWT auth over HTTPS in production, and
        role-based access. Payments are handled by Stripe / Apple / Google. Contact{' '}
        {branding.supportEmail || branding.contactEmail || 'privacy@stampz.app'} for GDPR requests.
      </p>
    </main>
  );
}
