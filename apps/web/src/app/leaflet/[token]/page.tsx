import { API_URL } from '@/lib/api';
import { LeafletPreview } from '@/components/LeafletPreview';
import Link from 'next/link';
import { PrintLeafletButton } from '@/components/PrintLeafletButton';

type PublicLeaflet = {
  id: string;
  headline: string;
  offerText: string;
  promoImageUrl?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  accentColor?: string | null;
  publicToken: string;
  template: { layoutId: string; name: string };
  merchant: {
    businessName: string;
    slug: string;
    logoUrl?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    tagline?: string | null;
  };
};

async function getLeaflet(token: string): Promise<PublicLeaflet | null> {
  try {
    const res = await fetch(`${API_URL}/api/leaflets/public/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PublicLeafletPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const leaflet = await getLeaflet(token);

  if (!leaflet) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F5F7] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-extrabold">Leaflet not found</h1>
          <p className="mt-2 text-sm text-[#8E8E93]">This flyer is unpublished or the link is invalid.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-bold text-[#FF5A5F]">
            Go to Stampz
          </Link>
        </div>
      </main>
    );
  }

  const webOrigin = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const qrTarget = `${webOrigin}/b/${leaflet.merchant.slug}`;
  const autoPrint = sp.print === '1';

  return (
    <main className="min-h-[100dvh] bg-[#E8ECF0] px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-lg print:max-w-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-[#8E8E93]">
              {leaflet.merchant.businessName}
            </div>
            <h1 className="text-lg font-extrabold">{leaflet.headline}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/b/${leaflet.merchant.slug}`}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold"
            >
              View shop
            </Link>
            <PrintLeafletButton autoPrint={autoPrint} />
          </div>
        </div>

        <div className="leaflet-print-root rounded-2xl bg-white p-4 shadow-lg print:rounded-none print:p-0 print:shadow-none">
          <LeafletPreview
            layoutId={leaflet.template.layoutId}
            businessName={leaflet.merchant.businessName}
            headline={leaflet.headline}
            offerText={leaflet.offerText}
            logoUrl={leaflet.logoUrl || leaflet.merchant.logoUrl}
            promoImageUrl={leaflet.promoImageUrl}
            phone={leaflet.phone || leaflet.merchant.phone}
            address={
              leaflet.address ||
              [leaflet.merchant.address, leaflet.merchant.city].filter(Boolean).join(', ')
            }
            accentColor={leaflet.accentColor}
            qrTarget={qrTarget}
          />
        </div>
      </div>
    </main>
  );
}
