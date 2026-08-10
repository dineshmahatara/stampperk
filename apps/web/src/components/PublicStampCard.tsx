'use client';

import { StampCardPreview, type ProfileContact } from '@/components/StampCardPreview';

/** Client wrapper so public SSR page can show flip preview */
export function PublicStampCard(props: {
  businessName: string;
  categorySlug?: string;
  categoryLabel?: string;
  logoUrl?: string;
  promoImageUrl?: string;
  logoScale?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  logoPosX?: number;
  logoPosY?: number;
  tagline?: string;
  totalStamps: number;
  rewardTitle: string;
  stampColor?: string;
  emptyStampColor?: string;
  accentColor?: string;
  fontStyle?: string | null;
  profile?: ProfileContact;
}) {
  return (
    <StampCardPreview
      businessName={props.businessName}
      categorySlug={props.categorySlug}
      categoryLabel={props.categoryLabel}
      logoUrl={props.logoUrl}
      promoImageUrl={props.promoImageUrl}
      logoScale={props.logoScale}
      logoOffsetX={props.logoOffsetX}
      logoOffsetY={props.logoOffsetY}
      logoPosX={props.logoPosX}
      logoPosY={props.logoPosY}
      tagline={props.tagline}
      totalStamps={props.totalStamps}
      filledStamps={Math.min(3, Math.max(0, props.totalStamps - 1))}
      rewardTitle={props.rewardTitle}
      stampColor={props.stampColor}
      emptyStampColor={props.emptyStampColor}
      accentColor={props.accentColor}
      fontStyle={props.fontStyle}
      doubleSided
      profile={props.profile}
    />
  );
}
