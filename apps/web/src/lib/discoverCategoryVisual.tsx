import type { ReactNode } from 'react';

/** Category / business-type visuals for Discover list avatars (web). */

export type DiscoverCategoryVisualId =
  | 'food-beverage'
  | 'retail'
  | 'health-beauty'
  | 'fitness'
  | 'automotive'
  | 'professional-services'
  | 'healthcare'
  | 'education'
  | 'entertainment'
  | 'hospitality'
  | 'other';

export type DiscoverCategoryVisual = {
  id: DiscoverCategoryVisualId;
  color: string;
  bg: string;
};

const COLORS: Record<DiscoverCategoryVisualId, DiscoverCategoryVisual> = {
  'food-beverage': { id: 'food-beverage', color: '#FF5A5F', bg: '#FFE0E3' },
  retail: { id: 'retail', color: '#D97706', bg: '#FEF3C7' },
  'health-beauty': { id: 'health-beauty', color: '#DB2777', bg: '#FCE7F3' },
  fitness: { id: 'fitness', color: '#059669', bg: '#D1FAE5' },
  automotive: { id: 'automotive', color: '#2563EB', bg: '#DBEAFE' },
  'professional-services': { id: 'professional-services', color: '#7C3AED', bg: '#EDE9FE' },
  healthcare: { id: 'healthcare', color: '#0D9488', bg: '#CCFBF1' },
  education: { id: 'education', color: '#0891B2', bg: '#CFFAFE' },
  entertainment: { id: 'entertainment', color: '#EA580C', bg: '#FFEDD5' },
  hospitality: { id: 'hospitality', color: '#9333EA', bg: '#F3E8FF' },
  other: { id: 'other', color: '#FF5A5F', bg: '#FFE0E3' },
};

/** Match leaf category, industry, or business name keywords. */
export function resolveCategoryVisual(
  category?: string | null,
  businessName?: string,
): DiscoverCategoryVisual {
  const hay = `${category || ''} ${businessName || ''}`.toLowerCase();

  const rules: Array<{ id: DiscoverCategoryVisualId; test: RegExp }> = [
    {
      id: 'food-beverage',
      test: /coffee|cafe|tea|restaurant|food|bakery|pizza|bar|juice|drink|choc|beverage|dessert|grocery|convenience|supermarket|ice.?cream|bubble.?tea|fast.?food/i,
    },
    {
      id: 'automotive',
      test: /auto|car|bike|tire|fuel|wash|vehicle|detailing/i,
    },
    {
      id: 'health-beauty',
      test: /beauty|salon|spa|nail|hair|barber|skin|makeup|tattoo|cosmetic|massage|wellness/i,
    },
    {
      id: 'fitness',
      test: /gym|yoga|fitness|pilates|dance|swim|martial|barbell/i,
    },
    {
      id: 'retail',
      test: /cloth|fashion|shoe|shop|store|retail|electronics|jewelry|gift|book|toy|mobile|accessories|cap/i,
    },
    {
      id: 'healthcare',
      test: /clinic|dental|pharma|hospital|vet|physio|health|eye.?clinic|pharmacy/i,
    },
    {
      id: 'education',
      test: /school|tuition|coach|training|music|language|education|institute/i,
    },
    {
      id: 'entertainment',
      test: /cinema|game|bowl|park|fun|entertainment|escape|amusement|gaming/i,
    },
    {
      id: 'professional-services',
      test: /laundry|repair|print|photo|cowork|service|tailor|it.?center|digital.?market/i,
    },
    {
      id: 'hospitality',
      test: /hotel|resort|homestay|travel|tour|hospitality/i,
    },
  ];

  const hit = rules.find((r) => r.test.test(hay));
  return COLORS[hit?.id || 'other'];
}

type IconProps = { className?: string; stroke?: string };

function IconWrap({
  children,
  className = 'h-5 w-5',
  stroke = 'currentColor',
}: {
  children: ReactNode;
  className?: string;
  stroke?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function CategoryTypeIcon({
  id,
  className = 'h-5 w-5',
  color = 'currentColor',
}: {
  id: DiscoverCategoryVisualId;
  className?: string;
  color?: string;
}) {
  const p = { className, stroke: color };
  switch (id) {
    case 'food-beverage':
      return (
        <IconWrap {...p}>
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" x2="6" y1="2" y2="4" />
          <line x1="10" x2="10" y1="2" y2="4" />
          <line x1="14" x2="14" y1="2" y2="4" />
        </IconWrap>
      );
    case 'retail':
      return (
        <IconWrap {...p}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </IconWrap>
      );
    case 'health-beauty':
      return (
        <IconWrap {...p}>
          <circle cx="6" cy="6" r="3" />
          <path d="M8.12 8.12 12 12" />
          <path d="M20 4 8.12 15.88" />
          <path d="M14.5 9.5 20 4" />
          <path d="m16 16-1.5 1.5a2.12 2.12 0 0 1-3 0L8 14" />
        </IconWrap>
      );
    case 'fitness':
      return (
        <IconWrap {...p}>
          <path d="M17.5 6.5 14 10l3.5 3.5" />
          <path d="M6.5 6.5 10 10 6.5 13.5" />
          <path d="M4 10h2" />
          <path d="M18 10h2" />
          <path d="M10 10h4" />
          <path d="M4 8v4" />
          <path d="M20 8v4" />
        </IconWrap>
      );
    case 'automotive':
      return (
        <IconWrap {...p}>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </IconWrap>
      );
    case 'professional-services':
      return (
        <IconWrap {...p}>
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </IconWrap>
      );
    case 'healthcare':
      return (
        <IconWrap {...p}>
          <path d="M11 2v2" />
          <path d="M13 2v2" />
          <path d="M11 20v2" />
          <path d="M13 20v2" />
          <path d="m19.07 4.93-1.41 1.41" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <circle cx="12" cy="12" r="6" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </IconWrap>
      );
    case 'education':
      return (
        <IconWrap {...p}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </IconWrap>
      );
    case 'entertainment':
      return (
        <IconWrap {...p}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 3v18" />
          <path d="M3 7.5h4" />
          <path d="M3 12h18" />
          <path d="M3 16.5h4" />
          <path d="M17 3v18" />
          <path d="M17 7.5h4" />
          <path d="M17 16.5h4" />
        </IconWrap>
      );
    case 'hospitality':
      return (
        <IconWrap {...p}>
          <path d="M2 4v16" />
          <path d="M2 8h18a2 2 0 0 1 2 2v10" />
          <path d="M2 17h20" />
          <path d="M6 8v9" />
        </IconWrap>
      );
    default:
      return (
        <IconWrap {...p}>
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
          <path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
        </IconWrap>
      );
  }
}
