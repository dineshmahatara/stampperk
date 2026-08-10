import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { formatLocationParts, openExternalMaps } from '../maps';
import {
  DARK_MAP_STYLE,
  DISCOVER_MAP_STYLES,
  type DiscoverMapStyleId,
} from '../mapStyles';
import { PublicMerchantScreen } from './PublicMerchantScreen';
import type { Session } from './LoginScreen';

type DiscoverResult = {
  id: string;
  businessName: string;
  slug: string;
  category?: string | null;
  verified?: boolean;
  tagline?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  mobile?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  distanceKm?: number | null;
};

type DiscoverCategory = {
  id: string;
  label: string;
  merchantCount?: number;
};

const FALLBACK = { lat: 27.7172, lng: 85.324 };

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: 'grid',
  'food-beverage': 'cafe',
  retail: 'shirt',
  'health-beauty': 'cut',
  fitness: 'barbell',
  automotive: 'car',
  'professional-services': 'briefcase',
  healthcare: 'medkit',
  education: 'school',
  entertainment: 'film',
  hospitality: 'bed',
  more: 'ellipsis-horizontal',
  other: 'storefront',
};

const CATEGORY_COLORS: Record<string, string> = {
  all: '#FF5A5F',
  'food-beverage': '#FF5A5F',
  retail: '#F59E0B',
  'health-beauty': '#EC4899',
  fitness: '#10B981',
  automotive: '#3B82F6',
  'professional-services': '#8B5CF6',
  healthcare: '#14B8A6',
  education: '#06B6D4',
  entertainment: '#F97316',
  hospitality: '#A855F7',
  more: '#64748B',
  other: '#FF5A5F',
};

function shortLabel(label: string) {
  return label.length > 12 ? `${label.slice(0, 10)}…` : label;
}

function resolveCategoryVisual(category?: string | null, businessName?: string) {
  const hay = `${category || ''} ${businessName || ''}`.toLowerCase();
  const rules: Array<{ id: string; test: RegExp }> = [
    { id: 'food-beverage', test: /coffee|cafe|tea|restaurant|food|bakery|pizza|bar|juice|drink|choc|beverage|grocery/i },
    { id: 'automotive', test: /auto|car|bike|tire|fuel|wash|vehicle/i },
    { id: 'health-beauty', test: /beauty|salon|spa|nail|hair|barber|skin|makeup|tattoo/i },
    { id: 'fitness', test: /gym|yoga|fitness|pilates|dance|swim/i },
    { id: 'retail', test: /cloth|shop|store|retail|electronics|grocery|fashion|shoe/i },
    { id: 'healthcare', test: /clinic|dental|pharma|hospital|vet|physio|health/i },
    { id: 'education', test: /school|tuition|coach|training|music|language|education/i },
    { id: 'entertainment', test: /cinema|game|bowl|park|fun|entertainment/i },
    { id: 'professional-services', test: /laundry|repair|print|photo|cowork|service/i },
    { id: 'hospitality', test: /hotel|resort|homestay|travel|tour/i },
  ];
  const hit = rules.find((r) => r.test.test(hay));
  const id = hit?.id || 'other';
  return {
    id,
    icon: CATEGORY_ICONS[id] || 'storefront',
    color: CATEGORY_COLORS[id] || colors.coral,
  };
}

export function DiscoverScreen({ session }: { session?: Session | null }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [coords, setCoords] = useState(FALLBACK);
  const [locHint, setLocHint] = useState('Finding your location…');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DiscoverResult | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [mapStyleId, setMapStyleId] = useState<DiscoverMapStyleId>('standard');
  const [styleSheetOpen, setStyleSheetOpen] = useState(false);
  const [apiCategories, setApiCategories] = useState<DiscoverCategory[]>([]);
  const [showAllCats, setShowAllCats] = useState(false);

  const [locating, setLocating] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(300);
  const didCenterOnUser = useRef(false);

  const mapStyle = DISCOVER_MAP_STYLES.find((x) => x.id === mapStyleId) || DISCOVER_MAP_STYLES[0];
  /** Keep locate control above the bottom sheet so it works without a merchant selected. */
  const mapFloatBottom = sheetHeight + 14;

  const categories = useMemo(() => {
    const active = apiCategories.filter((c) => (c.merchantCount ?? 0) > 0);
    const rest = apiCategories.filter((c) => (c.merchantCount ?? 0) <= 0);
    const ordered = active.length ? [...active, ...rest] : apiCategories;
    const visible = showAllCats ? ordered : ordered.slice(0, 6);
    const chips: DiscoverCategory[] = [
      { id: 'all', label: 'All' },
      ...visible.map((c) => ({ ...c, label: shortLabel(c.label) })),
    ];
    if (!showAllCats && ordered.length > 6) {
      chips.push({ id: 'more', label: 'More…' });
    }
    return chips;
  }, [apiCategories, showAllCats]);

  const loadCategories = useCallback(() => {
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: '50',
    });
    api<{
      groups: Array<{
        id: string;
        displayLabel?: string;
        label?: { en?: string };
        merchantCount?: number;
      }>;
    }>(`/discovery/categories?${params.toString()}`)
      .then((r) => {
        setApiCategories(
          (r.groups || []).map((g) => ({
            id: g.id,
            label: g.displayLabel || g.label?.en || g.id,
            merchantCount: g.merchantCount ?? 0,
          })),
        );
      })
      .catch(() => setApiCategories([]));
  }, [coords.lat, coords.lng]);

  const load = useCallback(() => {
    setLoading(true);
    const { lat, lng } = coords;
    const params = new URLSearchParams({
      q,
      lat: String(lat),
      lng: String(lng),
      radiusKm: '50',
    });
    if (categoryId !== 'all' && categoryId !== 'more') {
      params.set('groupId', categoryId);
    }
    if (verifiedOnly) params.set('verified', '1');
    api<{ results: DiscoverResult[] }>(`/discovery/search?${params.toString()}`)
      .then((r) => setResults(r.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));

    if (session?.token) {
      api('/users/me/location', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      }).catch(() => undefined);
    }
  }, [q, session?.token, coords.lat, coords.lng, categoryId, verifiedOnly]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Location = await import('expo-location');
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          if (!cancelled) setLocHint('Using Kathmandu (location denied)');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocHint('Near you');
      } catch {
        if (!cancelled) setLocHint('Using Kathmandu (default)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // After first GPS fix, fly the map to the user even if no merchant is selected.
    if (didCenterOnUser.current) return;
    if (coords.lat === FALLBACK.lat && coords.lng === FALLBACK.lng) return;
    didCenterOnUser.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      400,
    );
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const mapped = results.filter(
    (m) => typeof m.latitude === 'number' && typeof m.longitude === 'number',
  );

  const region: Region = {
    latitude: selected?.latitude ?? coords.lat,
    longitude: selected?.longitude ?? coords.lng,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
  };

  async function goMyLocation() {
    setLocating(true);
    setSelected(null);
    setLocHint('Finding your location…');
    try {
      const Location = await import('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocHint('Location permission needed');
        mapRef.current?.animateToRegion(
          {
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          400,
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(next);
      setLocHint('Near you');
      mapRef.current?.animateToRegion(
        {
          latitude: next.lat,
          longitude: next.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        450,
      );
    } catch {
      setLocHint('Could not get current location');
      mapRef.current?.animateToRegion(
        {
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        400,
      );
    } finally {
      setLocating(false);
    }
  }

  function refresh() {
    loadCategories();
    load();
    void goMyLocation();
  }

  if (profileSlug) {
    return (
      <PublicMerchantScreen
        slug={profileSlug}
        session={session}
        onBack={() => setProfileSlug(null)}
      />
    );
  }

  return (
    <View style={s.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType={mapStyle.mapType}
        customMapStyle={mapStyleId === 'dark' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle={mapStyleId === 'dark' ? 'dark' : 'light'}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {mapped.map((m) => {
          const visual = resolveCategoryVisual(m.category, m.businessName);
          const active = selected?.id === m.id;
          return (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.latitude!, longitude: m.longitude! }}
              tracksViewChanges={false}
              onPress={(e) => {
                e.stopPropagation?.();
                setSelected(m);
              }}
            >
              <View style={s.markerWrap}>
                <View
                  style={[
                    s.markerIcon,
                    { backgroundColor: visual.color },
                    active && s.markerIconOn,
                  ]}
                >
                  <Ionicons name={visual.icon} size={active ? 22 : 18} color="#fff" />
                </View>
                <View style={[s.markerPointer, { borderTopColor: visual.color }]} />
                <Text style={[s.markerName, active && { color: visual.color }]} numberOfLines={1}>
                  {m.businessName}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} style={s.topBar} pointerEvents="box-none">
        <View style={s.topRow}>
          <Text style={s.title}>Discover</Text>
          <View style={s.topActions}>
            <Pressable style={s.iconBtn} onPress={refresh}>
              <Ionicons name="refresh" size={18} color={colors.ink} />
            </Pressable>
            <Pressable style={s.iconBtn}>
              <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            </Pressable>
          </View>
        </View>
        <Text style={s.locHint}>{locHint}</Text>
      </SafeAreaView>

      <Pressable
        style={[s.layersBtn, { top: insets.top + 78 }]}
        onPress={() => setStyleSheetOpen(true)}
        accessibilityLabel="Map style"
      >
        <Ionicons name="layers-outline" size={22} color={colors.ink} />
      </Pressable>

      <Pressable
        style={[s.locateBtn, { bottom: mapFloatBottom }, locating && { opacity: 0.7 }]}
        onPress={() => void goMyLocation()}
        disabled={locating}
        accessibilityLabel="Go to current location"
        hitSlop={8}
      >
        {locating ? (
          <ActivityIndicator color={colors.coral} size="small" />
        ) : (
          <Ionicons name="locate" size={22} color={colors.coral} />
        )}
      </Pressable>

      <Modal
        visible={styleSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStyleSheetOpen(false)}
      >
        <Pressable style={s.styleBackdrop} onPress={() => setStyleSheetOpen(false)}>
          <Pressable
            style={[s.styleSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={s.styleHead}>
              <Text style={s.styleTitle}>Map style</Text>
              <Pressable onPress={() => setStyleSheetOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            {DISCOVER_MAP_STYLES.map((opt) => {
              const on = opt.id === mapStyleId;
              return (
                <Pressable
                  key={opt.id}
                  style={[s.styleRow, on && s.styleRowOn]}
                  onPress={() => {
                    setMapStyleId(opt.id);
                    setStyleSheetOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.styleLabel}>{opt.label}</Text>
                    <Text style={s.styleDesc}>{opt.description}</Text>
                  </View>
                  <View style={[s.radio, on && s.radioOn]}>
                    {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        {selected ? (
          <BusinessPeek
            merchant={selected}
            onBack={() => setSelected(null)}
            onViewProfile={() => setProfileSlug(selected.slug)}
          />
        ) : (
          <>
            <View style={s.handle} />
            <View style={s.searchRow}>
              <View style={s.searchBox}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  style={s.searchInput}
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search shops or offers"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <Pressable style={s.filterBtn} onPress={refresh}>
                <Ionicons name="options-outline" size={20} color={colors.coral} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.catRow}
            >
              {categories.map((c) => {
                const on = categoryId === c.id || (c.id === 'more' && showAllCats);
                const tint = CATEGORY_COLORS[c.id] || colors.coral;
                return (
                  <Pressable
                    key={c.id}
                    style={s.catItem}
                    onPress={() => {
                      if (c.id === 'more') {
                        setShowAllCats(true);
                        return;
                      }
                      setCategoryId(c.id);
                    }}
                  >
                    <View
                      style={[
                        s.catIcon,
                        { backgroundColor: on ? tint : `${tint}22` },
                      ]}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[c.id] || 'ellipse'}
                        size={20}
                        color={on ? '#fff' : tint}
                      />
                    </View>
                    <Text style={[s.catLabel, on && { color: colors.coral, fontWeight: '800' }]}>
                      {c.label}
                    </Text>
                    {c.id !== 'all' && c.id !== 'more' && c.merchantCount != null && c.merchantCount > 0 && (
                      <Text style={s.catCount}>{c.merchantCount}</Text>
                    )}
                  </Pressable>
                );
              })}
              <Pressable
                style={s.catItem}
                onPress={() => setVerifiedOnly((v) => !v)}
              >
                <View
                  style={[
                    s.catIcon,
                    { backgroundColor: verifiedOnly ? colors.coral : `${colors.coral}22` },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={verifiedOnly ? '#fff' : colors.coral}
                  />
                </View>
                <Text
                  style={[s.catLabel, verifiedOnly && { color: colors.coral, fontWeight: '800' }]}
                >
                  Verified
                </Text>
              </Pressable>
            </ScrollView>

            {loading ? (
              <ActivityIndicator color={colors.coral} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                {results.map((m) => {
                  const location = formatLocationParts(m.address, m.city, m.district);
                  return (
                    <Pressable
                      key={m.id}
                      style={s.resultCard}
                      onPress={() => {
                        setSelected(m);
                        if (m.latitude != null && m.longitude != null) {
                          mapRef.current?.animateToRegion(
                            {
                              latitude: m.latitude,
                              longitude: m.longitude,
                              latitudeDelta: 0.02,
                              longitudeDelta: 0.02,
                            },
                            350,
                          );
                        }
                      }}
                    >
                      <View style={s.resultLogo}>
                        {m.logoUrl ? (
                          <Image source={{ uri: m.logoUrl }} style={s.resultLogoImg} />
                        ) : (
                          <Text style={s.resultLetter}>{m.businessName.slice(0, 1)}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={s.resultName} numberOfLines={1}>
                            {m.businessName}
                          </Text>
                          {m.verified ? (
                            <Ionicons name="checkmark-circle" size={16} color={colors.coral} />
                          ) : null}
                        </View>
                        <Text style={s.resultCat}>{m.category || 'Business'}</Text>
                        {!!location && (
                          <Text style={s.resultAddr} numberOfLines={2}>
                            {location}
                          </Text>
                        )}
                      </View>
                      {m.distanceKm != null && (
                        <Text style={s.dist}>{m.distanceKm.toFixed(1)} km</Text>
                      )}
                    </Pressable>
                  );
                })}
                {!results.length && (
                  <Text style={s.empty}>No shops found — try another search or category.</Text>
                )}
                <Text style={s.footerHint}>Move or zoom the map to explore more.</Text>
              </ScrollView>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function BusinessPeek({
  merchant,
  onBack,
  onViewProfile,
}: {
  merchant: DiscoverResult;
  onBack: () => void;
  onViewProfile: () => void;
}) {
  const location = formatLocationParts(merchant.address, merchant.city, merchant.district);
  const phone = merchant.phone || merchant.mobile;
  const mapsTarget = {
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    address: location || undefined,
    label: merchant.businessName,
    googleMapsUrl: merchant.googleMapsUrl,
  };

  return (
    <View>
      <View style={s.peekHead}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={s.peekTitle}>Business details</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={s.peekBody}>
        <View style={s.resultLogo}>
          {merchant.logoUrl ? (
            <Image source={{ uri: merchant.logoUrl }} style={s.resultLogoImg} />
          ) : (
            <Text style={s.resultLetter}>{merchant.businessName.slice(0, 1)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.resultName}>{merchant.businessName}</Text>
          <Text style={s.resultCat}>{merchant.category || 'Business'}</Text>
          {!!location && <Text style={s.resultAddr}>{location}</Text>}
        </View>
      </View>
      <View style={s.peekActions}>
        <Pressable style={s.softBtn} onPress={() => openExternalMaps(mapsTarget)}>
          <Ionicons name="navigate" size={16} color={colors.coral} />
          <Text style={s.softBtnText}>Directions</Text>
        </Pressable>
        <Pressable
          style={[s.softBtn, !phone && { opacity: 0.45 }]}
          disabled={!phone}
          onPress={() => phone && Linking.openURL(`tel:${phone}`)}
        >
          <Ionicons name="call" size={16} color={colors.coral} />
          <Text style={s.softBtnText}>Call</Text>
        </Pressable>
      </View>
      <Pressable style={s.primaryBtn} onPress={onViewProfile}>
        <Text style={s.primaryBtnText}>View business profile</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 6,
  },
  topActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  locHint: {
    marginTop: 4,
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 4,
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 40,
    elevation: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: {},
    }),
  },
  layersBtn: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 40,
    elevation: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: {},
    }),
  },
  styleBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  styleSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  styleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  styleTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  styleRowOn: { backgroundColor: colors.pink },
  styleLabel: { fontSize: 15, fontWeight: '800', color: colors.ink },
  styleDesc: { marginTop: 2, fontSize: 12, color: colors.muted },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  markerWrap: { alignItems: 'center', maxWidth: 110 },
  markerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 5 },
    }),
  },
  markerIconOn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
  },
  markerPointer: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.coral,
  },
  markerName: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 110,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 280,
    maxHeight: '52%',
    borderTopWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 8 },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 10,
  },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRow: { gap: 14, paddingVertical: 14, paddingRight: 8 },
  catItem: { alignItems: 'center', width: 64 },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catLabel: { fontSize: 10, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  catCount: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
    color: colors.coral,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultLogoImg: { width: 52, height: 52 },
  resultLetter: { fontSize: 20, fontWeight: '800', color: colors.coral },
  resultName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  resultCat: { marginTop: 2, fontSize: 12, fontWeight: '700', color: colors.coral },
  resultAddr: { marginTop: 2, fontSize: 12, color: colors.muted },
  dist: { fontSize: 11, fontWeight: '700', color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 12, fontSize: 13 },
  footerHint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    marginTop: 10,
    marginBottom: 6,
  },
  peekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  peekTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  peekBody: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  peekActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  softBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  softBtnText: { color: colors.coral, fontWeight: '800', fontSize: 13 },
  primaryBtn: {
    backgroundColor: colors.coral,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
