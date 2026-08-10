import { useRef, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  GestureResponderEvent,
  Image,
  ImageBackground,
} from 'react-native';
import { categoryLabelFromSlug } from '@stampz/shared';
import { colors } from '../theme';
import { LogoImage } from './LogoImage';

export type ProfileContact = {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  deliveryEnabled?: boolean | null;
  tagline?: string | null;
  slug?: string | null;
  contactPerson?: string | null;
};

export type StampCardPreviewProps = {
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
  filledStamps?: number;
  rewardTitle: string;
  rewardDescription?: string;
  stampColor?: string;
  emptyStampColor?: string;
  accentColor?: string;
  fontStyle?: 'sans' | 'rounded' | 'display' | string | null;
  doubleSided?: boolean;
  profile?: ProfileContact;
  expiryLabel?: string;
};

const GOLD = '#C9B08A';
const CREAM = '#F3EEE4';
const INK = '#16352A';

function hostFromUrl(raw?: string | null) {
  if (!raw) return '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 36);
}

function socialPath(raw?: string | null) {
  if (!raw) return '';
  const cleaned = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  const handle = parts.length > 1 ? parts[parts.length - 1] : cleaned;
  return handle.startsWith('/') ? handle : `/${handle.replace(/^@/, '')}`;
}

function stampSlotSize(count: number) {
  if (count <= 8) return 30;
  if (count <= 12) return 26;
  if (count <= 16) return 24;
  return 22;
}

export function StampCardPreview({
  businessName,
  categorySlug,
  categoryLabel,
  logoUrl,
  promoImageUrl,
  logoScale = 1,
  logoOffsetX = 0,
  logoOffsetY = 0,
  logoPosX = 50,
  logoPosY = 32,
  tagline,
  totalStamps,
  filledStamps = 0,
  rewardTitle,
  stampColor = INK,
  emptyStampColor = GOLD,
  accentColor = CREAM,
  fontStyle = 'sans',
  doubleSided = true,
  profile,
  expiryLabel,
}: StampCardPreviewProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const drag = useRef<{ startX: number; flipped: boolean } | null>(null);
  const label = categoryLabel || (categorySlug ? categoryLabelFromSlug(categorySlug) : 'Category');
  const slots = Math.max(3, Math.min(30, totalStamps));
  const visibleSlots = Math.min(slots, 20);
  const slotSize = stampSlotSize(visibleSlots);
  const filled = Math.max(0, Math.min(filledStamps, slots));
  const location = [profile?.address, profile?.city].filter(Boolean).join(', ') || profile?.city || '';
  const displayTagline = tagline || profile?.tagline || label || 'Loyalty rewards';
  const website = hostFromUrl(profile?.website);
  const social =
    socialPath(profile?.instagram) ||
    socialPath(profile?.facebook) ||
    socialPath(profile?.tiktok) ||
    (website ? `/${website.split('/')[0]}` : '/yourbrand');
  const offer = `Collect ${slots} stamps · Get ${rewardTitle || '1 free reward'}`;
  const emptyTone = emptyStampColor || GOLD;
  const nameWeight = fontStyle === 'display' ? ('700' as const) : ('900' as const);

  function flip() {
    setSide((s) => (s === 'front' ? 'back' : 'front'));
  }

  function onTouchStart(e: GestureResponderEvent) {
    if (!doubleSided) return;
    drag.current = { startX: e.nativeEvent.pageX, flipped: false };
  }

  function onTouchMove(e: GestureResponderEvent) {
    if (!doubleSided || !drag.current || drag.current.flipped) return;
    if (Math.abs(e.nativeEvent.pageX - drag.current.startX) >= 48) {
      drag.current.flipped = true;
      flip();
    }
  }

  function onTouchEnd(e: GestureResponderEvent) {
    if (!doubleSided || !drag.current) return;
    const { startX, flipped } = drag.current;
    drag.current = null;
    if (!flipped && Math.abs(e.nativeEvent.pageX - startX) < 10) flip();
  }

  const frontInner = (
    <>
      <View style={styles.frontBody}>
        <View
          style={[
            styles.logoRing,
            {
              left: `${logoPosX}%`,
              top: `${logoPosY}%`,
              transform: [{ translateX: -36 }, { translateY: -36 }, { scale: logoScale }],
            },
          ]}
        >
          {logoUrl ? (
            <LogoImage
              uri={logoUrl}
              size={72}
              borderRadius={36}
              style={{
                transform: [
                  { translateX: (logoOffsetX / 100) * 72 },
                  { translateY: (logoOffsetY / 100) * 72 },
                ],
              }}
            />
          ) : (
            <Text style={[styles.logoFallback, { color: stampColor }]}>LOGO</Text>
          )}
        </View>
        <View style={styles.frontText}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>STAMP CARD</Text>
          </View>
          <Text style={[styles.frontName, { fontWeight: nameWeight }]} numberOfLines={1}>
            {businessName || 'Your Business'}
          </Text>
          <Text style={styles.frontTag} numberOfLines={1}>
            {displayTagline}
          </Text>
          <Text style={styles.frontOffer} numberOfLines={1}>
            {offer}
          </Text>
        </View>
      </View>
    </>
  );

  const cardBody =
    side === 'front' || !doubleSided ? (
      promoImageUrl ? (
        <ImageBackground source={{ uri: promoImageUrl }} style={[styles.card, { backgroundColor: stampColor }]} imageStyle={styles.coverImg}>
          <View style={styles.coverScrim} />
          {frontInner}
        </ImageBackground>
      ) : (
        <View style={[styles.card, { backgroundColor: stampColor }]}>
          <View style={styles.frontGlow} />
          {frontInner}
        </View>
      )
    ) : (
      <View style={[styles.card, { backgroundColor: accentColor }]}>
        <View style={styles.backRow}>
          <View style={styles.backLeft}>
            <Text style={[styles.backName, { color: stampColor, fontWeight: nameWeight }]} numberOfLines={1}>
              {businessName || 'Your Business'}
            </Text>
            <Text style={[styles.backTag, { color: stampColor }]} numberOfLines={1}>
              {displayTagline}
            </Text>
            {website ? (
              <Text style={[styles.backWeb, { color: stampColor }]} numberOfLines={1}>
                {website}
              </Text>
            ) : null}
            <Text style={[styles.offer, { color: stampColor }]} numberOfLines={2}>
              {offer}
            </Text>
            <View style={styles.stamps}>
              {Array.from({ length: visibleSlots }).map((_, i) => {
                const isReward = i === visibleSlots - 1;
                const isFilled = i < filled;
                return (
                  <View
                    key={i}
                    style={[
                      styles.slot,
                      {
                        width: slotSize,
                        height: slotSize,
                        borderRadius: slotSize / 2,
                        borderColor: isFilled ? stampColor : emptyTone,
                        borderStyle: isFilled ? 'solid' : 'dashed',
                        backgroundColor: isFilled ? (logoUrl ? '#fff' : `${stampColor}22`) : `${emptyTone}33`,
                      },
                    ]}
                  >
                    {isFilled && logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.slotLogo} />
                    ) : (
                      <Text style={{ color: stampColor, fontSize: 9, fontWeight: '800', opacity: isFilled ? 1 : 0.55 }}>
                        {isReward ? '★' : i + 1}
                      </Text>
                    )}
                    {isFilled && logoUrl && isReward ? (
                      <View style={styles.slotStarOverlay}>
                        <Text style={styles.slotStar}>★</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {slots > visibleSlots ? (
              <Text style={[styles.contact, { color: stampColor, opacity: 0.55 }]}>
                +{slots - visibleSlots} more stamps
              </Text>
            ) : null}
            {profile?.email ? (
              <Text style={[styles.contact, { color: stampColor }]} numberOfLines={1}>
                ✉ {profile.email}
              </Text>
            ) : null}
            {profile?.phone ? (
              <Text style={[styles.contact, { color: stampColor }]} numberOfLines={1}>
                ☎ {profile.phone}
              </Text>
            ) : null}
            {location ? (
              <Text style={[styles.contact, { color: stampColor }]} numberOfLines={1}>
                ⌖ {location}
              </Text>
            ) : null}
            {expiryLabel ? (
              <Text style={[styles.contact, { color: stampColor, opacity: 0.6 }]} numberOfLines={1}>
                Expires: {expiryLabel}
              </Text>
            ) : null}
          </View>
          <View style={[styles.qrCol, { borderLeftColor: 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.qrHint, { color: stampColor }]}>Scan for offers</Text>
          </View>
        </View>
        <View style={[styles.footerBar, { backgroundColor: stampColor }]}>
          <Text style={styles.footerMeta} numberOfLines={1}>
            f  ⌕  ⌖  {social}
          </Text>
        </View>
      </View>
    );

  return (
    <View>
      {doubleSided ? (
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onTouchStart}
          onResponderMove={onTouchMove}
          onResponderRelease={onTouchEnd}
          onResponderTerminate={() => {
            drag.current = null;
          }}
        >
          {cardBody}
        </View>
      ) : (
        cardBody
      )}
      {doubleSided ? (
        <Text style={styles.hint}>
          Tap or swipe card to see {side === 'front' ? 'back' : 'front'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  coverImg: { resizeMode: 'cover' },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  frontGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  frontBody: { flex: 1, position: 'relative' },
  logoRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoFallback: { fontWeight: '800', fontSize: 11 },
  frontText: { position: 'absolute', left: 18, right: 18, bottom: 18, alignItems: 'center' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  pillText: { color: 'rgba(255,255,255,0.92)', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  frontName: { color: '#fff', fontSize: 22, letterSpacing: 0.3, textAlign: 'center' },
  frontTag: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  frontOffer: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  backRow: { flex: 1, flexDirection: 'row', paddingTop: 14, paddingHorizontal: 12 },
  backLeft: { flex: 1, paddingRight: 8 },
  backName: { fontSize: 15, letterSpacing: 0.3 },
  backTag: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginTop: 2, opacity: 0.75 },
  backWeb: { fontSize: 11, fontWeight: '600', marginTop: 4, opacity: 0.65 },
  offer: { fontSize: 10, fontWeight: '700', marginTop: 8 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10, marginBottom: 8 },
  slot: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotLogo: { width: '100%', height: '100%' },
  slotStarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotStar: { color: '#fff', fontSize: 10, fontWeight: '800' },
  contact: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  qrCol: { width: 84, borderLeftWidth: 1, paddingLeft: 10, alignItems: 'center', justifyContent: 'center' },
  qrHint: { fontSize: 9, fontWeight: '600', textAlign: 'center', opacity: 0.7 },
  footerBar: { paddingVertical: 10, paddingHorizontal: 14 },
  footerMeta: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
});
