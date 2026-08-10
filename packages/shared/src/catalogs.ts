import { MEDIA_LIBRARY_GENERATED } from './media-library.generated';

/** Business category tree for merchant onboarding & loyalty cards. */
export const BUSINESS_CATEGORY_TREE = [
  {
    id: 'food-beverage',
    label: 'Food & Beverage',
    children: [
      { id: 'coffee-stamp-card', label: 'Coffee Stamp Card' },
      { id: 'tea-shop-loyalty', label: 'Tea Shop Loyalty' },
      { id: 'restaurant-rewards', label: 'Restaurant Rewards' },
      { id: 'fast-food-loyalty', label: 'Fast Food Loyalty' },
      { id: 'pizza-stamp-card', label: 'Pizza Stamp Card' },
      { id: 'bakery-stamp-card', label: 'Bakery Stamp Card' },
      { id: 'ice-cream-rewards', label: 'Ice Cream Rewards' },
      { id: 'juice-bar-loyalty', label: 'Juice Bar Loyalty' },
      { id: 'bubble-tea-rewards', label: 'Bubble Tea Rewards' },
      { id: 'bar-pub-loyalty', label: 'Bar & Pub Loyalty' },
    ],
  },
  {
    id: 'retail',
    label: 'Retail',
    children: [
      { id: 'clothing-store', label: 'Clothing Store' },
      { id: 'shoe-store', label: 'Shoe Store' },
      { id: 'cosmetics-beauty', label: 'Cosmetics & Beauty' },
      { id: 'jewelry-store', label: 'Jewelry Store' },
      { id: 'gift-shop', label: 'Gift Shop' },
      { id: 'bookstore', label: 'Bookstore' },
      { id: 'toy-store', label: 'Toy Store' },
      { id: 'electronics-store', label: 'Electronics Store' },
      { id: 'mobile-accessories', label: 'Mobile Accessories' },
      { id: 'supermarket', label: 'Supermarket' },
    ],
  },
  {
    id: 'health-beauty',
    label: 'Health & Beauty',
    children: [
      { id: 'hair-salon', label: 'Hair Salon' },
      { id: 'barber-shop', label: 'Barber Shop' },
      { id: 'beauty-salon', label: 'Beauty Salon' },
      { id: 'spa-wellness', label: 'Spa & Wellness' },
      { id: 'nail-studio', label: 'Nail Studio' },
      { id: 'massage-center', label: 'Massage Center' },
      { id: 'skincare-clinic', label: 'Skincare Clinic' },
      { id: 'makeup-studio', label: 'Makeup Studio' },
      { id: 'tattoo-studio', label: 'Tattoo Studio' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    children: [
      { id: 'gym-membership', label: 'Gym Membership' },
      { id: 'yoga-studio', label: 'Yoga Studio' },
      { id: 'pilates-studio', label: 'Pilates Studio' },
      { id: 'dance-studio', label: 'Dance Studio' },
      { id: 'martial-arts-academy', label: 'Martial Arts Academy' },
      { id: 'swimming-pool', label: 'Swimming Pool' },
    ],
  },
  {
    id: 'automotive',
    label: 'Automotive',
    children: [
      { id: 'car-wash', label: 'Car Wash' },
      { id: 'bike-wash', label: 'Bike Wash' },
      { id: 'auto-service-center', label: 'Auto Service Center' },
      { id: 'tire-shop', label: 'Tire Shop' },
      { id: 'fuel-station', label: 'Fuel Station' },
      { id: 'car-detailing', label: 'Car Detailing' },
    ],
  },
  {
    id: 'professional-services',
    label: 'Professional Services',
    children: [
      { id: 'laundry-dry-cleaning', label: 'Laundry & Dry Cleaning' },
      { id: 'tailor-shop', label: 'Tailor Shop' },
      { id: 'printing-service', label: 'Printing Service' },
      { id: 'photography-studio', label: 'Photography Studio' },
      { id: 'repair-shop', label: 'Repair Shop' },
      { id: 'coworking-space', label: 'Coworking Space' },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    children: [
      { id: 'dental-clinic', label: 'Dental Clinic' },
      { id: 'eye-clinic', label: 'Eye Clinic' },
      { id: 'physiotherapy-center', label: 'Physiotherapy Center' },
      { id: 'pharmacy', label: 'Pharmacy' },
      { id: 'veterinary-clinic', label: 'Veterinary Clinic' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    children: [
      { id: 'tuition-center', label: 'Tuition Center' },
      { id: 'music-school', label: 'Music School' },
      { id: 'language-institute', label: 'Language Institute' },
      { id: 'training-center', label: 'Training Center' },
      { id: 'coaching-institute', label: 'Coaching Institute' },
    ],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    children: [
      { id: 'cinema', label: 'Cinema' },
      { id: 'gaming-center', label: 'Gaming Center' },
      { id: 'bowling-alley', label: 'Bowling Alley' },
      { id: 'escape-room', label: 'Escape Room' },
      { id: 'amusement-park', label: 'Amusement Park' },
    ],
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    children: [
      { id: 'hotel', label: 'Hotel' },
      { id: 'resort', label: 'Resort' },
      { id: 'homestay', label: 'Homestay' },
      { id: 'travel-agency', label: 'Travel Agency' },
      { id: 'tour-operator', label: 'Tour Operator' },
    ],
  },
  {
    id: 'home-services',
    label: 'Home Services',
    children: [
      { id: 'cleaning-service', label: 'Cleaning Service' },
      { id: 'pest-control', label: 'Pest Control' },
      { id: 'gardening-service', label: 'Gardening Service' },
      { id: 'home-maintenance', label: 'Home Maintenance' },
    ],
  },
  {
    id: 'pet-services',
    label: 'Pet Services',
    children: [
      { id: 'pet-shop', label: 'Pet Shop' },
      { id: 'pet-grooming', label: 'Pet Grooming' },
      { id: 'veterinary-service', label: 'Veterinary Service' },
      { id: 'pet-boarding', label: 'Pet Boarding' },
    ],
  },
  {
    id: 'event-services',
    label: 'Event Services',
    children: [
      { id: 'event-planner', label: 'Event Planner' },
      { id: 'catering-service', label: 'Catering Service' },
      { id: 'decoration-service', label: 'Decoration Service' },
      { id: 'wedding-studio', label: 'Wedding Studio' },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    children: [
      { id: 'online-store', label: 'Online Store' },
      { id: 'subscription-box', label: 'Subscription Box' },
      { id: 'digital-products', label: 'Digital Products' },
      { id: 'marketplace-seller', label: 'Marketplace Seller' },
    ],
  },
] as const;

export type CategoryGroup = (typeof BUSINESS_CATEGORY_TREE)[number];
export type CategoryLeaf = CategoryGroup['children'][number];

export function findCategoryLeaf(slug: string): { group: CategoryGroup; leaf: CategoryLeaf } | null {
  for (const group of BUSINESS_CATEGORY_TREE) {
    const leaf = group.children.find((c) => c.id === slug);
    if (leaf) return { group, leaf };
  }
  return null;
}

export function categoryLabelFromSlug(slug: string): string {
  return findCategoryLeaf(slug)?.leaf.label ?? slug;
}

/** Curated logo icons served from API `/library/...` (category-aware picker). */
export type MediaLibraryItem = {
  id: string;
  /** Parent group id from BUSINESS_CATEGORY_TREE */
  categoryGroup: string;
  /** Optional leaf slug; when set, preferred for that category */
  categorySlug?: string;
  label: string;
  /** Public path on API host, e.g. `/library/food-beverage/coffee.svg` */
  path: string;
};

/** 500+ unique Lucide-based tiles (regenerate via `npm run library:icons`). */
export const MEDIA_LIBRARY: MediaLibraryItem[] = MEDIA_LIBRARY_GENERATED;

export function mediaLibraryGroupLabel(groupId: string): string {
  return BUSINESS_CATEGORY_TREE.find((g) => g.id === groupId)?.label || groupId;
}

export function mediaLibraryForCategory(categorySlug?: string | null): MediaLibraryItem[] {
  if (!categorySlug) return [...MEDIA_LIBRARY];
  const found = findCategoryLeaf(categorySlug);
  const groupId = found?.group.id;
  const preferred = MEDIA_LIBRARY.filter((i) => i.categorySlug === categorySlug);
  const groupItems = groupId
    ? MEDIA_LIBRARY.filter((i) => i.categoryGroup === groupId && i.categorySlug !== categorySlug)
    : [];
  const rest = MEDIA_LIBRARY.filter(
    (i) => i.categorySlug !== categorySlug && i.categoryGroup !== groupId,
  );
  return [...preferred, ...groupItems, ...rest];
}

export type MediaLibraryGroup = {
  id: string;
  label: string;
  items: MediaLibraryItem[];
};

export function groupMediaLibrary(
  items: MediaLibraryItem[],
  opts?: { search?: string; groupId?: string | null },
): MediaLibraryGroup[] {
  const q = (opts?.search || '').trim().toLowerCase();
  const filterGroup = opts?.groupId || null;
  const filtered = items.filter((item) => {
    if (filterGroup && item.categoryGroup !== filterGroup) return false;
    if (!q) return true;
    const groupLabel = mediaLibraryGroupLabel(item.categoryGroup).toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      groupLabel.includes(q) ||
      (item.categorySlug || '').toLowerCase().includes(q)
    );
  });

  const byGroup = new Map<string, MediaLibraryItem[]>();
  for (const item of filtered) {
    const list = byGroup.get(item.categoryGroup) || [];
    list.push(item);
    byGroup.set(item.categoryGroup, list);
  }

  const orderedIds = [
    ...BUSINESS_CATEGORY_TREE.map((g) => g.id),
    ...[...byGroup.keys()].filter((id) => !BUSINESS_CATEGORY_TREE.some((g) => g.id === id)),
  ];

  return orderedIds
    .filter((id) => byGroup.has(id))
    .map((id) => ({
      id,
      label: mediaLibraryGroupLabel(id),
      items: byGroup.get(id)!,
    }));
}

export const REWARD_CAMPAIGN_TYPES = [
  { id: 'buy-x-get-1-free', label: 'Buy X, Get 1 Free', badge: 'BOGO', offerType: 'FREE_ITEM' as const, description: 'Buy a set amount and get one free.' },
  { id: 'visit-based', label: 'Visit-Based Rewards', badge: 'VISITS', offerType: 'CUSTOM' as const, description: 'Reward customers after a number of visits.' },
  { id: 'spend-based', label: 'Spend-Based Rewards', badge: 'SPEND', offerType: 'FIXED' as const, description: 'Unlock rewards after spending a target amount.' },
  { id: 'birthday', label: 'Birthday Rewards', badge: 'BDAY', offerType: 'PERCENTAGE' as const, description: 'Special offer on the customer birthday.' },
  { id: 'referral', label: 'Referral Rewards', badge: 'REFER', offerType: 'CUSTOM' as const, description: 'Reward customers who bring friends.' },
  { id: 'first-visit', label: 'First Visit Bonus', badge: 'NEW', offerType: 'PERCENTAGE' as const, description: 'Welcome bonus for first-time visitors.' },
  { id: 'seasonal', label: 'Seasonal Campaigns', badge: 'SEASON', offerType: 'PERCENTAGE' as const, description: 'Limited seasonal promotions.' },
  { id: 'double-stamp', label: 'Double Stamp Days', badge: '2X', offerType: 'CUSTOM' as const, description: 'Earn double stamps on selected days.' },
  { id: 'vip', label: 'VIP Loyalty Program', badge: 'VIP', offerType: 'CUSTOM' as const, description: 'Exclusive rewards for top customers.' },
  { id: 'membership', label: 'Membership Rewards', badge: 'MEMBER', offerType: 'FIXED' as const, description: 'Ongoing membership perks.' },
  { id: 'cashback-stamps', label: 'Cashback Stamps', badge: 'CASH', offerType: 'FIXED' as const, description: 'Convert stamps into cashback value.' },
  { id: 'challenge', label: 'Challenge-Based Rewards', badge: 'GOAL', offerType: 'CUSTOM' as const, description: 'Complete a challenge to unlock a reward.' },
  { id: 'anniversary', label: 'Anniversary Rewards', badge: 'YEAR', offerType: 'PERCENTAGE' as const, description: 'Celebrate joining anniversary.' },
  { id: 'limited-time', label: 'Limited-Time Promotions', badge: 'FLASH', offerType: 'PERCENTAGE' as const, description: 'Short window promotional offers.' },
] as const;

export const LoyaltyCardType = {
  CLASSIC: 'CLASSIC',
  THRESHOLD: 'THRESHOLD',
  MULTI_STEP: 'MULTI_STEP',
} as const;
export type LoyaltyCardType = (typeof LoyaltyCardType)[keyof typeof LoyaltyCardType];

export const ThresholdType = {
  VISITS: 'VISITS',
  SPEND: 'SPEND',
} as const;
export type ThresholdType = (typeof ThresholdType)[keyof typeof ThresholdType];

export const STAMP_COLORS = [
  { id: 'forest', label: 'Forest', value: '#16352A' },
  { id: 'gold', label: 'Gold', value: '#C9B08A' },
  { id: 'coral', label: 'Coral', value: '#FF5A5F' },
  { id: 'rose', label: 'Rose', value: '#E11D48' },
  { id: 'orange', label: 'Orange', value: '#F97316' },
  { id: 'amber', label: 'Amber', value: '#F59E0B' },
  { id: 'emerald', label: 'Emerald', value: '#10B981' },
  { id: 'sky', label: 'Sky', value: '#0EA5E9' },
  { id: 'violet', label: 'Violet', value: '#8B5CF6' },
  { id: 'ink', label: 'Ink', value: '#1C1C1E' },
] as const;

export const CARD_FONTS = [
  { id: 'sans', label: 'Sans', css: 'system-ui, sans-serif' },
  { id: 'rounded', label: 'Rounded', css: 'ui-rounded, "Nunito", system-ui, sans-serif' },
  { id: 'display', label: 'Display', css: 'Georgia, "Times New Roman", serif' },
] as const;

export const CARD_TEMPLATES = [
  {
    id: 'story-forest',
    label: 'Story Forest',
    cardType: 'CLASSIC' as const,
    stampColor: '#16352A',
    emptyStampColor: '#C9B08A',
    accentColor: '#F3EEE4',
    fontStyle: 'sans' as const,
    background: 'linear-gradient(160deg, #16352A 0%, #1F4A3A 100%)',
  },
  {
    id: 'classic-pink',
    label: 'Classic Pink',
    cardType: 'CLASSIC' as const,
    stampColor: '#FF5A5F',
    emptyStampColor: '#FFD6D8',
    accentColor: '#FFE8EA',
    fontStyle: 'rounded' as const,
    background: 'linear-gradient(160deg, #FFF5F6 0%, #FFE8EA 100%)',
  },
  {
    id: 'classic-coral',
    label: 'Classic Coral',
    cardType: 'CLASSIC' as const,
    stampColor: '#E8455A',
    emptyStampColor: '#FBCFE8',
    accentColor: '#FFF1F2',
    fontStyle: 'sans' as const,
    background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF1F2 100%)',
  },
  {
    id: 'mint-fresh',
    label: 'Mint Fresh',
    cardType: 'CLASSIC' as const,
    stampColor: '#10B981',
    emptyStampColor: '#D1FAE5',
    accentColor: '#ECFDF5',
    fontStyle: 'rounded' as const,
    background: 'linear-gradient(160deg, #F0FDF4 0%, #DCFCE7 100%)',
  },
  {
    id: 'night-ink',
    label: 'Night Ink',
    cardType: 'CLASSIC' as const,
    stampColor: '#FF5A5F',
    emptyStampColor: '#3F3F46',
    accentColor: '#27272A',
    fontStyle: 'display' as const,
    background: 'linear-gradient(160deg, #18181B 0%, #27272A 100%)',
  },
  {
    id: 'spend-earn',
    label: 'Spend & Earn',
    cardType: 'THRESHOLD' as const,
    stampColor: '#F97316',
    emptyStampColor: '#FED7AA',
    accentColor: '#FFF7ED',
    fontStyle: 'sans' as const,
    background: 'linear-gradient(160deg, #FFFBEB 0%, #FFEDD5 100%)',
  },
  {
    id: 'multi-milestone',
    label: 'Multi Milestone',
    cardType: 'MULTI_STEP' as const,
    stampColor: '#8B5CF6',
    emptyStampColor: '#E9D5FF',
    accentColor: '#F5F3FF',
    fontStyle: 'rounded' as const,
    background: 'linear-gradient(160deg, #FAF5FF 0%, #F3E8FF 100%)',
  },
] as const;

/** Fixed leaflet layout keys — Super Admin assigns these to templates. */
export const LEAFLET_LAYOUTS = [
  {
    id: 'hero-a5',
    label: 'Hero A5',
    description: 'Photo on top, logo + headline + offer + QR below',
    ratio: 'A5',
  },
  {
    id: 'story-square',
    label: 'Story Square',
    description: 'Square / IG-story friendly promo',
    ratio: '1:1',
  },
  {
    id: 'offer-band',
    label: 'Offer Band',
    description: 'Strong offer strip with logo and QR',
    ratio: 'landscape',
  },
  {
    id: 'minimal-qr',
    label: 'Minimal QR',
    description: 'Logo, short offer, large QR',
    ratio: 'portrait',
  },
] as const;

export type LeafletLayoutId = (typeof LEAFLET_LAYOUTS)[number]['id'];

export function getLoyaltyCatalog() {
  return {
    categories: BUSINESS_CATEGORY_TREE,
    campaignTypes: REWARD_CAMPAIGN_TYPES,
    templates: CARD_TEMPLATES,
    stampColors: STAMP_COLORS,
    fonts: CARD_FONTS,
    mediaLibrary: MEDIA_LIBRARY,
    cardTypes: [
      {
        id: 'CLASSIC',
        label: 'Classic stamp card',
        description: 'Customers collect stamps and unlock a reward.',
      },
      {
        id: 'THRESHOLD',
        label: 'Threshold reward',
        description: 'Customers unlock a reward after reaching a target.',
      },
      {
        id: 'MULTI_STEP',
        label: 'Multi-step card',
        description: 'Unlock rewards at multiple stamp milestones.',
      },
    ],
  };
}
