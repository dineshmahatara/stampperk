import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { PrimaryButton } from '../ui';
import { StampCardPreview } from '../components/StampCardPreview';
import { formatLocationParts, openExternalMaps } from '../maps';
import { isNetworkError, useOfflineOptional } from '../offline';
import { useAppBranding } from '../branding';
import { clearMobileReferral, readMobileReferral, saveMobileReferral } from '../referral';
import type { Session } from './LoginScreen';

const FAV_KEY = 'stampperk_favorite_slugs';
const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL ||
  (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(':4000', ':3000');

type Program = {
  id: string;
  title: string;
  totalStamps: number;
  rewardTitle: string;
  rewardDescription?: string | null;
  stampColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  logoScale?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
  logoPosX?: number | null;
  logoPosY?: number | null;
  promoImageUrl?: string | null;
  businessName?: string | null;
  categorySlug?: string | null;
  emptyStampColor?: string | null;
  fontStyle?: string | null;
  doubleSided?: boolean | null;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
};

type PublicLink = { id: string; label: string; url: string };
type GalleryPhoto = { id: string; url: string };
type Branch = {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type PublicMerchant = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  verified?: boolean;
  description?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  supportPhone?: string | null;
  email?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  currency?: string;
  hoursJson?: Record<string, string> | null;
  deliveryEnabled?: boolean;
  deliveryNote?: string | null;
  supportNote?: string | null;
  contactPerson?: string | null;
  businessType?: string | null;
  yearEstablished?: number | null;
  loyaltyPrograms?: Program[];
  campaigns?: Array<{ id: string; title: string; badgeText: string; description: string; imageUrl?: string | null }>;
  menuItems?: MenuItem[];
  gallery?: GalleryPhoto[];
  publicLinks?: PublicLink[];
  branches?: Branch[];
};

function hoursSummary(hours?: Record<string, string> | null): string {
  if (!hours || typeof hours !== 'object') return 'Hours unavailable';
  const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ];
  const keys = Object.keys(hours);
  const hit =
    keys.find((k) => k.toLowerCase() === today) ||
    keys.find((k) => /mon.*fri|weekday/i.test(k)) ||
    keys[0];
  if (!hit) return 'Hours unavailable';
  return `${hit}: ${hours[hit]}`;
}

function money(amount: number | null | undefined, currency = 'NPR') {
  if (amount == null) return '';
  return `${currency} ${amount.toLocaleString()}`;
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
}) {
  const empty = !value;
  const content = (
    <View style={ps.detailRow}>
      <View style={ps.detailIcon}>
        <Ionicons name={icon} size={18} color={colors.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ps.detailLabel}>{label}</Text>
        <Text style={[ps.detailValue, empty && { color: colors.muted }]}>
          {empty ? 'No information added' : value}
        </Text>
      </View>
      {!!onPress && !empty && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </View>
  );
  if (onPress && !empty) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

export function PublicMerchantScreen({
  slug,
  session,
  onBack,
  referralCode,
  referralProgramId,
}: {
  slug: string;
  session?: Session | null;
  onBack: () => void;
  referralCode?: string | null;
  referralProgramId?: string | null;
}) {
  const offline = useOfflineOptional();
  const { branding } = useAppBranding(session?.token);
  const companyName = branding.companyName || 'Stamp Perk';
  const [business, setBusiness] = useState<PublicMerchant | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (referralCode) {
      void saveMobileReferral({
        referralCode,
        referralMerchantId: business?.id,
        referralProgramId: referralProgramId || undefined,
      });
    }
  }, [referralCode, referralProgramId, business?.id]);

  useEffect(() => {
    if (!session?.token || !business?.id) return;
    void (async () => {
      const stored = (await readMobileReferral()) || (referralCode
        ? {
            referralCode,
            referralMerchantId: business.id,
            referralProgramId: referralProgramId || undefined,
          }
        : null);
      if (!stored?.referralCode) return;
      try {
        await api('/referrals/claim', {
          method: 'POST',
          token: session.token,
          body: JSON.stringify({
            referralCode: stored.referralCode,
            referralMerchantId: stored.referralMerchantId || business.id,
            referralProgramId: stored.referralProgramId,
          }),
        });
        await clearMobileReferral();
      } catch {
        /* ignore */
      }
    })();
  }, [session?.token, business?.id, referralCode, referralProgramId]);

  useEffect(() => {
    setError('');
    api<PublicMerchant>(`/merchants/public/${slug}`, { token: session?.token })
      .then(setBusiness)
      .catch((e) => setError(e instanceof Error ? e.message : 'Business not found'));
    AsyncStorage.getItem(FAV_KEY)
      .then((raw) => {
        const list: string[] = raw ? JSON.parse(raw) : [];
        setFavorite(list.includes(slug));
      })
      .catch(() => undefined);
  }, [slug, session?.token]);

  useEffect(() => {
    if (!session?.token) {
      setJoinedIds(new Set());
      return;
    }
    let cancelled = false;
    api<Array<{ program?: { id?: string }; programId?: string }>>('/loyalty/cards/me', {
      token: session.token,
    })
      .then((cards) => {
        if (cancelled) return;
        setJoinedIds(
          new Set(
            (cards || [])
              .map((c) => c.program?.id || c.programId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setJoinedIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token, slug]);

  const location = business
    ? formatLocationParts(
        business.address,
        business.city,
        business.district,
        business.province,
        business.country,
      )
    : '';
  const phone = business?.phone || business?.mobile;
  const mapsTarget = business
    ? {
        latitude: business.latitude,
        longitude: business.longitude,
        address: location || undefined,
        label: business.businessName,
        googleMapsUrl: business.googleMapsUrl,
      }
    : null;
  const cover = business?.gallery?.[0]?.url;
  const profileUrl = `${WEB_BASE}/b/${slug}`;
  const currency = business?.currency || 'NPR';

  const socials = useMemo(() => {
    if (!business) return [];
    return [
      { label: 'Facebook', href: business.facebook, icon: 'logo-facebook' as const },
      { label: 'Instagram', href: business.instagram, icon: 'logo-instagram' as const },
      { label: 'TikTok', href: business.tiktok, icon: 'logo-tiktok' as const },
      { label: 'YouTube', href: business.youtube, icon: 'logo-youtube' as const },
      { label: 'LinkedIn', href: business.linkedin, icon: 'logo-linkedin' as const },
      { label: 'X', href: business.twitter, icon: 'logo-twitter' as const },
    ].filter((s) => s.href);
  }, [business]);

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const updated = next ? [...new Set([...list, slug])] : list.filter((x) => x !== slug);
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  async function shareProfile() {
    try {
      await Share.share({
        message: `Check out ${business?.businessName} on ${companyName}: ${profileUrl}`,
        url: profileUrl,
        title: business?.businessName,
      });
    } catch {
      /* ignore */
    }
  }

  async function enroll(programId: string) {
    if (!session?.token) {
      setMsg('Sign in as a customer to join.');
      return;
    }
    if (joinedIds.has(programId)) return;
    setBusyId(programId);
    setMsg('');
    const program = business?.loyaltyPrograms?.find((p) => p.id === programId);
    try {
      if (offline && !offline.online) {
        await offline.queueEnroll({
          programId,
          programTitle: program?.title,
          merchantName: business?.businessName,
        });
        setJoinedIds((prev) => new Set(prev).add(programId));
        return;
      }
      await api(`/loyalty/programs/${programId}/enroll`, {
        method: 'POST',
        token: session.token,
      });
      setJoinedIds((prev) => new Set(prev).add(programId));
    } catch (e) {
      if (isNetworkError(e) && offline) {
        await offline.queueEnroll({
          programId,
          programTitle: program?.title,
          merchantName: business?.businessName,
        });
        setJoinedIds((prev) => new Set(prev).add(programId));
      } else {
        setMsg(e instanceof Error ? e.message : 'Could not enroll');
      }
    } finally {
      setBusyId(null);
    }
  }

  function openHttp(raw?: string | null) {
    if (!raw) return;
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    Linking.openURL(url);
  }

  if (!business && !error) {
    return (
      <SafeAreaView style={[ps.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.coral} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={ps.screen} edges={['top']}>
        <Pressable onPress={onBack} style={{ padding: 20 }}>
          <Text style={{ color: colors.coral, fontWeight: '800' }}>← Back</Text>
        </Pressable>
        <Text style={[ps.h1, { paddingHorizontal: 20 }]}>Business not found</Text>
        <Text style={{ color: colors.muted, paddingHorizontal: 20 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  const menu = business.menuItems || [];
  const programs = business.loyaltyPrograms || [];
  const links = business.publicLinks || [];
  const gallery = business.gallery || [];
  const offers = business.campaigns || [];
  const branches = business.branches || [];
  const hasMap = business.latitude != null && business.longitude != null;

  return (
    <SafeAreaView style={ps.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cover + logo */}
        <View style={ps.coverWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={ps.cover} />
          ) : (
            <View style={[ps.cover, ps.coverEmpty]}>
              <Ionicons name="camera-outline" size={28} color={colors.muted} />
              <Text style={ps.coverEmptyText}>Cover image unavailable</Text>
            </View>
          )}
          <Pressable style={ps.backFab} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={ps.logoBadge}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={ps.logoImg} />
            ) : (
              <Text style={ps.logoLetter}>{business.businessName.slice(0, 1)}</Text>
            )}
          </View>
        </View>

        <View style={ps.body}>
          <View style={ps.nameRow}>
            <Text style={ps.h1}>{business.businessName}</Text>
            {business.verified ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.coral} />
            ) : null}
            <Pressable onPress={toggleFavorite} hitSlop={10}>
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={26}
                color={colors.coral}
              />
            </Pressable>
          </View>
          {business.verified ? (
            <Text style={{ color: colors.coral, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
              Stamp Perk Verified
            </Text>
          ) : null}

          <View style={ps.metaRow}>
            <Ionicons name="restaurant" size={16} color={colors.coral} />
            <Text style={ps.metaText}>{business.category}</Text>
          </View>
          {!!location && (
            <Pressable
              style={ps.metaRow}
              onPress={() => mapsTarget && openExternalMaps(mapsTarget)}
            >
              <Ionicons name="location" size={16} color={colors.coral} />
              <Text style={[ps.metaText, { color: colors.coral, flex: 1 }]}>{location}</Text>
            </Pressable>
          )}
          <View style={ps.metaRow}>
            <Ionicons name="ellipse" size={10} color="#34C759" />
            <Text style={ps.metaText}>{hoursSummary(business.hoursJson)}</Text>
          </View>

          {/* Quick actions */}
          <View style={ps.quickRow}>
            {[
              {
                label: 'Call',
                icon: 'call' as const,
                disabled: !phone,
                onPress: () => phone && Linking.openURL(`tel:${phone}`),
              },
              {
                label: 'Directions',
                icon: 'navigate' as const,
                disabled: !mapsTarget,
                onPress: () => mapsTarget && openExternalMaps(mapsTarget),
              },
              {
                label: 'Share',
                icon: 'share-outline' as const,
                disabled: false,
                onPress: shareProfile,
              },
              {
                label: 'Website',
                icon: 'globe-outline' as const,
                disabled: !business.website,
                onPress: () => openHttp(business.website),
              },
            ].map((a) => (
              <Pressable
                key={a.label}
                style={[ps.quickBtn, a.disabled && { opacity: 0.4 }]}
                disabled={a.disabled}
                onPress={a.onPress}
              >
                <Ionicons name={a.icon} size={20} color={colors.coral} />
                <Text style={ps.quickLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {!!msg && <Text style={ps.banner}>{msg}</Text>}

          {/* Product menu */}
          <View style={ps.sectionHead}>
            <Text style={ps.sectionTitle}>Product Menu</Text>
            <Text style={ps.sectionCount}>
              {menu.length}/{Math.max(menu.length, 10)} products
            </Text>
          </View>
          {menu.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {menu.map((item) => (
                <View key={item.id} style={ps.menuCard}>
                  <View style={ps.menuImgWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={ps.menuImg} />
                    ) : (
                      <Ionicons name="fast-food-outline" size={28} color={colors.coral} />
                    )}
                  </View>
                  <Text style={ps.menuName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.price != null && (
                    <Text style={ps.menuPrice}>{money(item.price, currency)}</Text>
                  )}
                  {!!item.description && (
                    <Text style={ps.menuDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={ps.empty}>No products added yet.</Text>
          )}

          {/* Loyalty */}
          <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Loyalty Cards</Text>
          {programs.map((p) => (
            <View key={p.id} style={{ marginTop: 10 }}>
              <StampCardPreview
                businessName={p.businessName || business.businessName}
                categorySlug={p.categorySlug || undefined}
                categoryLabel={business.category}
                logoUrl={p.logoUrl || business.logoUrl || undefined}
                promoImageUrl={p.promoImageUrl || undefined}
                logoScale={p.logoScale ?? 1}
                logoOffsetX={p.logoOffsetX ?? 0}
                logoOffsetY={p.logoOffsetY ?? 0}
                logoPosX={p.logoPosX ?? 50}
                logoPosY={p.logoPosY ?? 32}
                tagline={business.tagline || undefined}
                totalStamps={p.totalStamps}
                filledStamps={0}
                rewardTitle={p.rewardTitle}
                rewardDescription={p.rewardDescription || undefined}
                stampColor={p.stampColor || undefined}
                emptyStampColor={p.emptyStampColor || undefined}
                accentColor={p.accentColor || undefined}
                fontStyle={p.fontStyle || undefined}
                doubleSided={p.doubleSided !== false}
                profile={{
                  phone: business.phone,
                  email: business.email,
                  website: business.website,
                  address: business.address,
                  city: business.city,
                  facebook: business.facebook,
                  instagram: business.instagram,
                  tiktok: business.tiktok,
                  deliveryEnabled: business.deliveryEnabled,
                  tagline: business.tagline,
                  slug: business.slug,
                }}
              />
              <Text style={ps.programTitle}>{p.title}</Text>
              {session &&
                (session.user.role === 'CUSTOMER' ||
                  session.user.role === 'MERCHANT_OWNER' ||
                  session.user.role === 'STAFF') && (
                <PrimaryButton
                  label={
                    busyId === p.id
                      ? 'Joining…'
                      : joinedIds.has(p.id)
                        ? 'Joined'
                        : 'Join'
                  }
                  onPress={() => enroll(p.id)}
                  disabled={busyId === p.id || joinedIds.has(p.id)}
                  outline={joinedIds.has(p.id)}
                />
              )}
            </View>
          ))}
          {!programs.length && <Text style={ps.empty}>No loyalty cards yet.</Text>}

          {/* Location map */}
          <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Location</Text>
          <View style={ps.card}>
            {hasMap ? (
              <MapView
                style={ps.map}
                pointerEvents="none"
                initialRegion={{
                  latitude: business.latitude!,
                  longitude: business.longitude!,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: business.latitude!,
                    longitude: business.longitude!,
                  }}
                />
              </MapView>
            ) : (
              <View style={[ps.map, ps.mapEmpty]}>
                <Ionicons name="map-outline" size={28} color={colors.muted} />
                <Text style={ps.empty}>Map unavailable</Text>
              </View>
            )}
            <View style={ps.locFooter}>
              <View style={{ flex: 1 }}>
                <Text style={ps.locLabel}>Business location</Text>
                <Text style={ps.locAddr}>{location || 'Address not added'}</Text>
              </View>
              <Pressable
                style={[ps.dirBtn, !mapsTarget && { opacity: 0.4 }]}
                disabled={!mapsTarget}
                onPress={() => mapsTarget && openExternalMaps(mapsTarget)}
              >
                <Text style={ps.dirBtnText}>Directions</Text>
              </Pressable>
            </View>
          </View>

          {/* Offers */}
          {offers.length > 0 && (
            <>
              <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Offers</Text>
              {offers.map((o) => (
                <View key={o.id} style={ps.cardPad}>
                  <Text style={ps.offerBadge}>{o.badgeText}</Text>
                  <Text style={ps.detailValue}>{o.title}</Text>
                  <Text style={ps.menuDesc}>{o.description}</Text>
                </View>
              ))}
            </>
          )}

          {/* Gallery */}
          {gallery.length > 1 && (
            <>
              <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {gallery.map((g) => (
                  <Image key={g.id} source={{ uri: g.url }} style={ps.galleryImg} />
                ))}
              </ScrollView>
            </>
          )}

          {/* Business details */}
          <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Business Details</Text>
          <View style={ps.card}>
            <DetailRow
              icon="call"
              label="Phone"
              value={phone}
              onPress={() => phone && Linking.openURL(`tel:${phone}`)}
            />
            <DetailRow
              icon="mail"
              label="Email"
              value={business.email}
              onPress={() => business.email && Linking.openURL(`mailto:${business.email}`)}
            />
            <DetailRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={business.whatsapp}
              onPress={() =>
                business.whatsapp &&
                Linking.openURL(`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`)
              }
            />
            <DetailRow
              icon="globe-outline"
              label="Website"
              value={business.website}
              onPress={() => openHttp(business.website)}
            />
            <DetailRow
              icon="paper-plane-outline"
              label="Public Profile"
              value={profileUrl}
              onPress={() => Linking.openURL(profileUrl)}
            />
            <DetailRow icon="time-outline" label="Business Hours" value={hoursSummary(business.hoursJson)} />
            <DetailRow icon="bicycle-outline" label="Delivery Note" value={business.deliveryNote} />
            <DetailRow
              icon="headset-outline"
              label="Customer Support"
              value={business.supportNote || business.supportPhone}
            />
            {business.contactPerson && (
              <DetailRow icon="person-outline" label="Contact Person" value={business.contactPerson} />
            )}
            {business.businessType && (
              <DetailRow icon="storefront-outline" label="Business Type" value={business.businessType} />
            )}
            {business.yearEstablished != null && (
              <DetailRow
                icon="calendar-outline"
                label="Established"
                value={String(business.yearEstablished)}
              />
            )}
            {!!business.description && (
              <View style={ps.detailRow}>
                <View style={ps.detailIcon}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.detailLabel}>About</Text>
                  <Text style={ps.detailValue}>{business.description}</Text>
                </View>
              </View>
            )}

            <Text style={[ps.detailLabel, { marginTop: 8, marginLeft: 52 }]}>Follow Us</Text>
            {socials.length ? (
              <View style={ps.socialRow}>
                {socials.map((s) => (
                  <Pressable key={s.label} style={ps.socialChip} onPress={() => openHttp(s.href)}>
                    <Ionicons name={s.icon} size={18} color={colors.coral} />
                    <Text style={ps.socialText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={[ps.empty, { marginLeft: 52 }]}>No social links added</Text>
            )}
          </View>

          {/* Public links */}
          <View style={ps.sectionHead}>
            <Text style={ps.sectionTitle}>Public Profile Links</Text>
            <Text style={ps.sectionCount}>{links.length}/12 links</Text>
          </View>
          {links.map((l) => (
            <Pressable key={l.id} style={ps.linkCard} onPress={() => openHttp(l.url)}>
              <View style={ps.detailIcon}>
                <Ionicons name="link" size={18} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ps.detailValue}>{l.label}</Text>
                <Text style={ps.menuDesc} numberOfLines={1}>
                  {l.url}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
          {!links.length && <Text style={ps.empty}>No public links added.</Text>}

          {/* Branches */}
          {branches.length > 0 && (
            <>
              <Text style={[ps.sectionTitle, { marginTop: 22 }]}>Locations</Text>
              {branches.map((b) => (
                <View key={b.id} style={ps.linkCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={ps.detailValue}>{b.name}</Text>
                    {!!b.address && <Text style={ps.menuDesc}>⌖ {b.address}</Text>}
                  </View>
                  <Pressable
                    onPress={() =>
                      openExternalMaps({
                        latitude: b.latitude,
                        longitude: b.longitude,
                        address: b.address,
                        label: b.name,
                      })
                    }
                  >
                    <Text style={{ color: colors.coral, fontWeight: '800', fontSize: 12 }}>
                      Navigate
                    </Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {/* Delivery */}
          <View style={ps.deliveryCard}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Ionicons name="bicycle" size={28} color={colors.coral} />
              <View style={{ flex: 1 }}>
                <Text style={ps.detailValue}>Delivery & Service</Text>
                <Text style={ps.menuDesc}>
                  {business.deliveryEnabled
                    ? business.deliveryNote || 'Delivery is available for this business.'
                    : 'Delivery is not available. Please visit this business in store.'}
                </Text>
              </View>
            </View>
            <Pressable
              style={ps.visitBtn}
              onPress={() => mapsTarget && openExternalMaps(mapsTarget)}
            >
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={ps.visitBtnText}>Visit in Store</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F3F4' },
  coverWrap: { marginBottom: 36 },
  cover: { width: '100%', height: 180, backgroundColor: '#EDE4E6' },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverEmptyText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  backFab: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    position: 'absolute',
    left: 20,
    bottom: -28,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  logoImg: { width: 72, height: 72 },
  logoLetter: { fontSize: 28, fontWeight: '800', color: colors.coral },
  body: { paddingHorizontal: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  h1: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  quickLabel: { fontSize: 11, fontWeight: '700', color: colors.ink },
  banner: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    color: '#047857',
    fontWeight: '700',
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHead: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sectionCount: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  menuCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuImgWrap: {
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  menuImg: { width: '100%', height: '100%' },
  menuName: { fontWeight: '800', fontSize: 14, color: colors.ink },
  menuPrice: { marginTop: 2, color: colors.coral, fontWeight: '700', fontSize: 12 },
  menuDesc: { marginTop: 2, color: colors.muted, fontSize: 12 },
  programTitle: { marginTop: 8, marginBottom: 8, fontWeight: '700', color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  cardPad: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 8,
  },
  map: { width: '100%', height: 160 },
  mapEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EBEF' },
  locFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  locLabel: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  locAddr: { marginTop: 2, color: colors.muted, fontSize: 12 },
  dirBtn: {
    backgroundColor: colors.pink,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dirBtnText: { color: colors.coral, fontWeight: '800', fontSize: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  detailValue: { marginTop: 2, fontSize: 14, fontWeight: '700', color: colors.ink },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 6 },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  socialText: { color: colors.coral, fontWeight: '700', fontSize: 12 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 8,
  },
  galleryImg: { width: 140, height: 100, borderRadius: 14 },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pink,
    color: colors.coral,
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  deliveryCard: {
    marginTop: 22,
    backgroundColor: colors.pink,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  visitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.coral,
    borderRadius: radii.pill,
    paddingVertical: 14,
  },
  visitBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { color: colors.muted, fontSize: 13, marginTop: 6 },
});
