import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, uploadMedia } from '../api';
import { colors, radii } from '../theme';
import { PrimaryButton } from '../ui';
import { StampCardPreview } from '../components/StampCardPreview';
import { Locale, LOCALE_OPTIONS, localeLabel } from '../i18n';
import type { Session } from './LoginScreen';
import {
  CustomerNotificationSettingsScreen,
  type NotifPrefs,
} from './CustomerNotificationSettingsScreen';
import {
  CustomerProfileEditScreen,
  type ProfileFields,
} from './CustomerProfileEditScreen';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { ReferEarnScreen } from './ReferEarnScreen';
import { SecurityScreen } from './SecurityScreen';

const FAV_KEY = 'stampz_favorite_slugs';
const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL ||
  (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(':4000', ':3000');

type Me = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  alternatePhone?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  municipality?: string | null;
  ward?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  language?: string | null;
  pushConsent?: boolean;
  notifyOffers?: boolean;
  notifyLoyalty?: boolean;
  notifyExpiry?: boolean;
  notifyTransfers?: boolean;
  notifyStaff?: boolean;
  lastLat?: number | null;
  lastLng?: number | null;
  createdAt?: string;
};

type WalletCard = {
  id: string;
  stampCount: number;
  availableRewards: number;
  completedCycles?: number;
  program: {
    title: string;
    totalStamps: number;
    rewardTitle: string;
    rewardDescription?: string | null;
    stampColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    promoImageUrl?: string | null;
    businessName?: string | null;
    categorySlug?: string | null;
    emptyStampColor?: string | null;
    fontStyle?: string | null;
    doubleSided?: boolean | null;
    merchant: {
      businessName: string;
      slug: string;
      logoUrl?: string | null;
      category?: string | null;
    };
  };
  redemptions?: Array<{ id: string; estimatedSavings?: number | null }>;
  stamps?: Array<{ saleAmount?: number | null }>;
};

type FavBiz = { slug: string; businessName: string; category?: string; logoUrl?: string | null };

function genderLabel(g?: string | null) {
  if (!g) return 'Not set';
  if (g === 'prefer_not_to_say') return 'Prefer Not To Say';
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function formatDob(raw?: string | null) {
  if (!raw) return 'Not set';
  const d = new Date(raw);
  if (Number.isNaN(+d)) return String(raw).slice(0, 10);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function MenuRow({
  icon,
  title,
  subtitle,
  right,
  danger,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  danger?: boolean;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[ps.menuRow, !last && ps.menuRowBorder]}
      disabled={!onPress}
    >
      <View style={[ps.menuIcon, danger && { backgroundColor: '#FFE4E6' }]}>
        <Ionicons name={icon} size={18} color={danger ? '#E11D48' : colors.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ps.menuTitle, danger && { color: '#E11D48' }]}>{title}</Text>
        {!!subtitle && <Text style={ps.menuSub}>{subtitle}</Text>}
      </View>
      {right}
      {!!onPress && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={ps.detailRow} onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.coral} />
      <Text style={ps.detailLabel}>{label}</Text>
      <Text style={ps.detailValue} numberOfLines={1}>
        {value}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
    </Pressable>
  );
}

export function CustomerProfileScreen({
  session,
  locale,
  setLocale,
  onLogout,
  onSwitchToBusiness,
}: {
  session: Session;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onLogout: () => void;
  /** Merchants in customer mode only — pure customers never get this. */
  onSwitchToBusiness?: () => void;
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [favorites, setFavorites] = useState<FavBiz[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editField, setEditField] = useState<null | {
    key: string;
    label: string;
    value: string;
    keyboard?: 'default' | 'phone-pad';
  }>(null);
  const [editValue, setEditValue] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const profile = await api<Me>('/auth/me', { token: session.token });
      setMe(profile);
      const wallet = await api<WalletCard[]>('/loyalty/cards/me', { token: session.token }).catch(
        () => [],
      );
      setCards(wallet || []);

      const raw = await AsyncStorage.getItem(FAV_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      const fromCards = (wallet || [])
        .filter((c) => slugs.includes(c.program.merchant.slug))
        .map((c) => ({
          slug: c.program.merchant.slug,
          businessName: c.program.merchant.businessName,
          category: c.program.merchant.category || undefined,
          logoUrl: c.program.logoUrl || c.program.merchant.logoUrl,
        }));
      // Keep favorites even if not enrolled — show slug placeholder
      const missing = slugs
        .filter((s) => !fromCards.some((f) => f.slug === s))
        .map((s) => ({ slug: s, businessName: s, category: 'Favorite' }));
      setFavorites([...fromCards, ...missing]);
    } catch {
      /* ignore */
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    let stamps = 0;
    let redeemed = 0;
    let expense = 0;
    let saving = 0;
    for (const c of cards) {
      stamps +=
        (c.completedCycles || 0) * (c.program.totalStamps || 0) + (c.stampCount || 0);
      redeemed += (c.redemptions || []).length;
      for (const r of c.redemptions || []) saving += r.estimatedSavings ?? 0;
      // sale amounts not always on cards/me — approximate from stamp count if missing
    }
    return {
      stamps,
      scans: stamps,
      activeCards: cards.length,
      redeemed,
      expense,
      saving,
    };
  }, [cards]);

  const memberSince = me?.createdAt
    ? new Date(me.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';

  const lat = me?.lastLat ?? 27.7172;
  const lng = me?.lastLng ?? 85.324;

  async function savePatch(body: Record<string, unknown>) {
    setBusy(true);
    setMsg('');
    try {
      const updated = await api<Me>('/users/me', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify(body),
      });
      setMe((prev) => ({ ...(prev || ({} as Me)), ...updated }));
      setMsg('Saved');
      setEditField(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to update your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const uploaded = await uploadMedia(
        {
          uri: asset.uri,
          name: asset.fileName || 'avatar.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        { token: session.token },
      );
      await savePatch({ photoUrl: uploaded.url });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateLocation() {
    try {
      const Location = await import('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location', 'Permission required to update your location.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await api('/users/me/location', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      });
      setMe((prev) =>
        prev
          ? { ...prev, lastLat: pos.coords.latitude, lastLng: pos.coords.longitude }
          : prev,
      );
      setMsg('Location updated');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not update location');
    }
  }

  function openEdit(key: string, label: string, value: string, keyboard?: 'default' | 'phone-pad') {
    if (key === 'gender') {
      Alert.alert('Gender', 'Choose an option', [
        { text: 'Male', onPress: () => void savePatch({ gender: 'male' }) },
        { text: 'Female', onPress: () => void savePatch({ gender: 'female' }) },
        { text: 'Other', onPress: () => void savePatch({ gender: 'other' }) },
        {
          text: 'Prefer not to say',
          onPress: () => void savePatch({ gender: 'prefer_not_to_say' }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setEditField({ key, label, value, keyboard });
    setEditValue(value === 'Not set' ? '' : value);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Account',
      'This permanently erases your account and all data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api('/privacy/account', { method: 'DELETE', token: session.token });
              onLogout();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
      ],
    );
  }

  const rewardsOwned = cards.reduce((s, c) => s + (c.availableRewards || 0), 0);

  if (notifOpen) {
    return (
      <CustomerNotificationSettingsScreen
        session={session}
        initial={me as NotifPrefs}
        onBack={() => setNotifOpen(false)}
        onSaved={(prefs) => setMe((prev) => ({ ...(prev || ({} as Me)), ...prefs }))}
      />
    );
  }

  if (referOpen) {
    return <ReferEarnScreen session={session} onBack={() => setReferOpen(false)} />;
  }

  if (securityOpen) {
    return (
      <SecurityScreen
        session={session}
        onBack={() => setSecurityOpen(false)}
        onLoggedOut={onLogout}
      />
    );
  }

  if (editOpen) {
    return (
      <CustomerProfileEditScreen
        session={session}
        initial={me as ProfileFields}
        onBack={() => setEditOpen(false)}
        onSaved={(profile) => {
          setMe((prev) => ({ ...(prev || ({} as Me)), ...profile }));
          setMsg('Profile updated');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={ps.screen} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={ps.pad} bottomExtra={120}>
        <View style={ps.header}>
          <Text style={ps.title}>Profile</Text>
          <Pressable style={ps.bell} onPress={() => setNotifOpen(true)}>
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {!!msg && <Text style={ps.banner}>{msg}</Text>}

        {/* Summary card */}
        <View style={ps.card}>
          <View style={ps.summaryRow}>
            <Pressable onPress={pickPhoto} style={ps.avatarWrap}>
              {me?.photoUrl ? (
                <Image source={{ uri: me.photoUrl }} style={ps.avatar} />
              ) : (
                <View style={[ps.avatar, ps.avatarEmpty]}>
                  <Text style={ps.avatarLetter}>{(me?.name || session.user.name).slice(0, 1)}</Text>
                </View>
              )}
              <View style={ps.camBadge}>
                <Ionicons name="camera" size={12} color={colors.coral} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={ps.nameRow}>
                <Text style={ps.name}>{me?.name || session.user.name}</Text>
                <Ionicons name="checkmark-circle" size={18} color={colors.coral} />
              </View>
              <View style={ps.metaLine}>
                <Ionicons name="mail-outline" size={13} color={colors.muted} />
                <Text style={ps.metaText} numberOfLines={1}>
                  {me?.email || session.user.email}
                </Text>
              </View>
              <View style={ps.metaLine}>
                <Ionicons name="call-outline" size={13} color={colors.muted} />
                <Text style={ps.metaText}>{me?.phone || 'No phone added'}</Text>
              </View>
              <View style={ps.metaLine}>
                <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                <Text style={ps.metaText}>Member since {memberSince}</Text>
              </View>
            </View>
            <Pressable onPress={() => setEditOpen(true)} hitSlop={8} style={ps.editIconBtn}>
              <Ionicons name="pencil" size={18} color={colors.coral} />
            </Pressable>
          </View>
          <Pressable style={ps.editProfileBtn} onPress={() => setEditOpen(true)}>
            <Ionicons name="create-outline" size={16} color={colors.coral} />
            <Text style={ps.editProfileText}>Edit profile</Text>
          </Pressable>
          {onSwitchToBusiness ? (
            <Pressable style={ps.switchBtn} onPress={onSwitchToBusiness}>
              <Ionicons name="storefront-outline" size={16} color={colors.coral} />
              <Text style={ps.switchText}>Switch to Business mode</Text>
            </Pressable>
          ) : (
            <Pressable style={ps.switchBtn} onPress={onLogout}>
              <Ionicons name="swap-horizontal" size={16} color={colors.coral} />
              <Text style={ps.switchText}>Switch Account</Text>
            </Pressable>
          )}
        </View>

        {/* Personal details */}
        <View style={ps.card}>
          <Pressable style={ps.sectionHead} onPress={() => setDetailsOpen((v) => !v)}>
            <View style={ps.sectionIcon}>
              <Ionicons name="person" size={18} color={colors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ps.sectionTitle}>Personal Details</Text>
              <Text style={ps.sectionSub}>Tap Edit profile to update these fields</Text>
            </View>
            <Pressable onPress={() => setEditOpen(true)} hitSlop={8}>
              <Text style={{ color: colors.coral, fontWeight: '800', fontSize: 13 }}>Edit</Text>
            </Pressable>
          </Pressable>
          {detailsOpen && (
            <View style={{ paddingBottom: 6 }}>
              <DetailRow
                icon="person-outline"
                label="Full Name"
                value={me?.name || session.user.name}
                onPress={() => setEditOpen(true)}
              />
              <DetailRow
                icon="call-outline"
                label="Phone"
                value={me?.phone || 'Not set'}
                onPress={() => setEditOpen(true)}
              />
              <DetailRow
                icon="flag-outline"
                label="Country"
                value={me?.country || 'NP'}
                onPress={() => setEditOpen(true)}
              />
              <DetailRow
                icon="male-female-outline"
                label="Gender"
                value={genderLabel(me?.gender)}
                onPress={() => setEditOpen(true)}
              />
              <DetailRow
                icon="gift-outline"
                label="Birthday"
                value={formatDob(me?.dateOfBirth)}
                onPress={() => setEditOpen(true)}
              />
              <DetailRow
                icon="home-outline"
                label="Address"
                value={
                  [me?.streetAddress, me?.city, me?.district].filter(Boolean).join(', ') ||
                  'Not set'
                }
                onPress={() => setEditOpen(true)}
              />
            </View>
          )}
        </View>

        {/* Location */}
        <View style={ps.card}>
          <Pressable style={ps.sectionHead} onPress={updateLocation}>
            <View style={ps.sectionIcon}>
              <Ionicons name="location" size={18} color={colors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ps.sectionTitle}>Location Selected</Text>
              <Text style={ps.sectionSub}>Tap to change location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.coral} />
          </Pressable>
          <Pressable onPress={updateLocation} style={ps.mapWrap}>
            <MapView
              style={ps.map}
              pointerEvents="none"
              region={{
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker coordinate={{ latitude: lat, longitude: lng }} />
            </MapView>
          </Pressable>
        </View>

        {/* Activity */}
        <Text style={ps.blockTitle}>Your activity</Text>
        <Text style={ps.blockSub}>A lifetime view across your Stampz cards.</Text>
        <View style={ps.statsGrid}>
          {[
            { label: 'Stamps', value: String(stats.stamps), icon: 'pricetag' as const },
            { label: 'Scans', value: String(stats.scans), icon: 'qr-code' as const },
            { label: 'Active cards', value: String(stats.activeCards), icon: 'storefront' as const },
            { label: 'Redeemed', value: String(stats.redeemed), icon: 'gift' as const },
            {
              label: 'Total expense',
              value: `Rs ${stats.expense}`,
              icon: 'wallet' as const,
            },
            {
              label: 'Total saving',
              value: `Rs ${stats.saving}`,
              icon: 'star' as const,
              green: true,
            },
          ].map((s) => (
            <View key={s.label} style={ps.statTile}>
              <Ionicons name={s.icon} size={18} color={s.green ? '#059669' : colors.coral} />
              <Text style={[ps.statValue, s.green && { color: '#059669' }]}>{s.value}</Text>
              <Text style={ps.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* My Collection */}
        <View style={ps.rowBetween}>
          <Text style={ps.blockTitle}>My Collection</Text>
          <Text style={ps.link}>View All ›</Text>
        </View>
        {cards.slice(0, 2).map((c) => (
          <View key={c.id} style={{ marginBottom: 12 }}>
            <StampCardPreview
              businessName={c.program.businessName || c.program.merchant.businessName}
              categorySlug={c.program.categorySlug || undefined}
              categoryLabel={c.program.merchant.category || undefined}
              logoUrl={c.program.logoUrl || c.program.merchant.logoUrl || undefined}
              promoImageUrl={c.program.promoImageUrl || undefined}
              totalStamps={c.program.totalStamps}
              filledStamps={c.stampCount}
              rewardTitle={c.program.rewardTitle}
              rewardDescription={c.program.rewardDescription || undefined}
              stampColor={c.program.stampColor || undefined}
              emptyStampColor={c.program.emptyStampColor || undefined}
              accentColor={c.program.accentColor || undefined}
              fontStyle={c.program.fontStyle || undefined}
              doubleSided={c.program.doubleSided !== false}
            />
          </View>
        ))}
        {!cards.length && (
          <View style={ps.emptyCard}>
            <Text style={ps.menuSub}>No loyalty cards yet — discover a store to join.</Text>
          </View>
        )}

        {/* Rewards collection */}
        <Text style={[ps.blockTitle, { marginTop: 8 }]}>Rewards Collection</Text>
        <Text style={ps.blockSub}>{rewardsOwned} rewards owned</Text>
        <View style={ps.emptyCard}>
          <Ionicons name="gift" size={36} color={colors.coral} />
          <Text style={[ps.menuSub, { flex: 1 }]}>
            Unlocked and redeemed rewards will collect here.
          </Text>
        </View>

        {/* Favorites */}
        <View style={ps.rowBetween}>
          <Text style={ps.blockTitle}>Favorite Businesses</Text>
          <Text style={ps.link}>View All ›</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {favorites.map((f) => (
            <View key={f.slug} style={ps.favCard}>
              <View style={ps.favLogo}>
                {f.logoUrl ? (
                  <Image source={{ uri: f.logoUrl }} style={ps.favLogoImg} />
                ) : (
                  <Text style={ps.avatarLetter}>{f.businessName.slice(0, 1)}</Text>
                )}
                <View style={ps.heart}>
                  <Ionicons name="heart" size={10} color={colors.coral} />
                </View>
              </View>
              <Text style={ps.favName} numberOfLines={1}>
                {f.businessName}
              </Text>
              <Text style={ps.favCat} numberOfLines={1}>
                {f.category || 'Business'}
              </Text>
            </View>
          ))}
          {!favorites.length && (
            <Text style={ps.menuSub}>Heart a business on its public profile to see it here.</Text>
          )}
        </ScrollView>

        {/* Preferences */}
        <Text style={ps.groupLabel}>Preferences</Text>
        <View style={ps.card}>
          <MenuRow
            icon="gift-outline"
            title="Refer & Earn"
            subtitle="Invite friends and earn bonus stamps."
            onPress={() => setReferOpen(true)}
          />
          <MenuRow
            icon="notifications"
            title="Notifications"
            subtitle="Personalize push alerts and categories."
            onPress={() => setNotifOpen(true)}
            right={
              <Text style={ps.pill}>{me?.pushConsent === false ? 'Off' : 'On'}</Text>
            }
          />
          <MenuRow
            icon="globe-outline"
            title="Language"
            subtitle="Choose your preferred language."
            onPress={() => setLangOpen(true)}
            right={<Text style={ps.pill}>{localeLabel(locale)}</Text>}
            last
          />
        </View>

        <Text style={ps.groupLabel}>Profile & Privacy</Text>
        <View style={ps.card}>
          <MenuRow
            icon="lock-closed"
            title="Security"
            subtitle="Devices, login history, logout all."
            onPress={() => setSecurityOpen(true)}
          />
          <MenuRow
            icon="shield-checkmark"
            title="Public Profile Privacy"
            subtitle="Choose what other people can see."
            onPress={() => Alert.alert('Privacy', 'Public profile visibility controls coming soon.')}
          />
          <MenuRow
            icon="eye-outline"
            title="Preview Public Profile"
            subtitle="See your profile as other people see it."
            onPress={() => Linking.openURL(`${WEB_BASE}/dashboard/settings`)}
            last
          />
        </View>

        <Text style={ps.groupLabel}>Support & Feedback</Text>
        <View style={ps.card}>
          <MenuRow
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help with your Stampz account."
            onPress={() => Linking.openURL('mailto:support@stampz.app')}
          />
          <MenuRow
            icon="megaphone"
            title="Give Feedback"
            subtitle="Share your suggestions with us."
            onPress={() => Linking.openURL('mailto:feedback@stampz.app?subject=Stampz%20Feedback')}
          />
          <MenuRow
            icon="star"
            title="Rate This App"
            subtitle="Love Stampz? Rate us on the App Store."
            onPress={() =>
              Alert.alert('Thanks!', 'Store rating links will open once the app is published.')
            }
            last
          />
        </View>

        <Text style={ps.groupLabel}>Legal</Text>
        <View style={ps.card}>
          <MenuRow
            icon="shield"
            title="Privacy Policy"
            subtitle="Learn how we protect your data."
            onPress={() => Linking.openURL(`${WEB_BASE}/privacy`).catch(() => undefined)}
            last
          />
        </View>

        <Text style={ps.groupLabel}>Account</Text>
        <View style={ps.card}>
          <MenuRow
            icon="trash"
            title="Delete Account"
            subtitle="Permanently erase your account and all data."
            danger
            onPress={confirmDelete}
            last
          />
        </View>

        <Pressable style={ps.logout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={ps.logoutText}>Log Out</Text>
        </Pressable>

        {busy && (
          <ActivityIndicator color={colors.coral} style={{ marginVertical: 12 }} />
        )}
      </KeyboardAwareScroll>

      {/* Field editor (quick single-field fallback) */}
      <Modal visible={!!editField} transparent animationType="slide">
        <KeyboardAvoidingView
          style={ps.modalBg}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEditField(null)} />
          <View style={ps.modalSheet}>
              <Text style={ps.sectionTitle}>{editField?.label}</Text>
              <TextInput
                style={ps.input}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={editField?.keyboard || 'default'}
                autoFocus
              />
              <PrimaryButton
                label={busy ? 'Saving…' : 'Save'}
                onPress={() => {
                  if (!editField) return;
                  void savePatch({ [editField.key]: editValue });
                }}
                disabled={busy}
              />
              <Pressable onPress={() => setEditOpen(true)} style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.coral, fontWeight: '700' }}>Open full editor</Text>
              </Pressable>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language */}
      <Modal visible={langOpen} transparent animationType="fade">
        <Pressable style={ps.modalBg} onPress={() => setLangOpen(false)}>
          <Pressable style={ps.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={ps.sectionTitle}>Language</Text>
            {LOCALE_OPTIONS.map((lang) => (
              <Pressable
                key={lang.code}
                style={[ps.langRow, locale === lang.code && ps.langRowOn]}
                onPress={() => {
                  setLocale(lang.code);
                  void savePatch({ language: lang.code });
                  setLangOpen(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={ps.menuTitle}>{lang.native}</Text>
                  <Text style={ps.menuSub}>
                    {lang.label}
                    {lang.dir === 'rtl' ? ' · Right-to-left' : ''}
                  </Text>
                </View>
                {locale === lang.code && <Ionicons name="checkmark" size={18} color={colors.coral} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F3F4' },
  pad: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  banner: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    fontWeight: '700',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.pink },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: colors.coral },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: colors.muted, fontSize: 12, flex: 1 },
  switchBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchText: { color: colors.coral, fontWeight: '800', fontSize: 12 },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
  },
  editProfileBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F1',
    borderRadius: radii.pill,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  editProfileText: { color: colors.coral, fontWeight: '800', fontSize: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailLabel: { color: colors.muted, fontSize: 12, width: 72, fontWeight: '600' },
  detailValue: { flex: 1, fontWeight: '700', color: colors.ink, fontSize: 13 },
  mapWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  map: { width: '100%', height: 140 },
  blockTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 6 },
  blockSub: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statTile: {
    width: '31.5%',
    backgroundColor: colors.pink,
    borderRadius: 14,
    padding: 10,
    minHeight: 78,
  },
  statValue: { marginTop: 6, fontSize: 16, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 10, color: colors.muted, fontWeight: '600', marginTop: 2 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  link: { color: colors.coral, fontWeight: '800', fontSize: 13 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  favCard: { width: 100, alignItems: 'center' },
  favLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  favLogoImg: { width: 64, height: 64, borderRadius: 32 },
  heart: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 3,
  },
  favName: { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  favCat: { fontSize: 11, color: colors.muted },
  groupLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  menuSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: {
    backgroundColor: colors.pink,
    color: colors.coral,
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: 4,
  },
  logout: {
    marginTop: 8,
    backgroundColor: colors.coral,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  langRowOn: { backgroundColor: colors.pink },
});
