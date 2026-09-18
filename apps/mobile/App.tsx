import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { api } from './src/api';
import { Locale, strings, applyLocaleDirection, reloadForRtlIfNeeded, LOCALE_OPTIONS, localeLabel, isRtlLocale } from './src/i18n';
import { colors, styles } from './src/theme';
import { Card, PrimaryButton, ScreenHeader, SettingRow, StatCard } from './src/ui';
import { StampPerkTabBar } from './src/TabBar';
import { LoginScreen, Session } from './src/screens/LoginScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import {
  AdminApprovalsScreen,
  AdminDashboardScreen,
  AdminManageScreen,
} from './src/screens/admin';
import { AdminMoreStack } from './src/screens/adminTools';
import { MerchantMoreStack } from './src/screens/merchantTools';
import { MerchantLoyaltyWizard } from './src/components/MerchantLoyaltyWizard';
import { MerchantEssentialsSetup } from './src/components/MerchantEssentialsSetup';
import { PushSendWizard } from './src/components/PushSendWizard';
import { StampCardPreview } from './src/components/StampCardPreview';
import { CustomerMyQrCard } from './src/components/CustomerMyQrCard';
import { KeyboardAwareScroll } from './src/components/KeyboardAwareScroll';
import { CustomerHomeScreen } from './src/screens/CustomerHomeScreen';
import { CustomerRewardsScreen } from './src/screens/CustomerRewardsScreen';
import { CustomerProfileScreen } from './src/screens/CustomerProfileScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { MerchantBusinessProfile } from './src/screens/MerchantBusinessProfile';
import { SecurityScreen } from './src/screens/SecurityScreen';
import { VerifiedBadgeScreen } from './src/screens/VerifiedBadgeScreen';
import { LogoImage } from './src/components/LogoImage';
import { usePushRegistration } from './src/push';
import { REWARD_CAMPAIGN_TYPES, categoryLabelFromSlug, merchantEssentialsReady } from '@stampperk/shared';
import { setActiveMerchantId } from './src/api';
import { AppMode, canUseBusinessMode, getAppMode, setAppMode } from './src/appMode';
import {
  OfflineProvider,
  OfflineBanner,
  isNetworkError,
  readCachedMyQr,
  readCachedWallet,
  readCachedPrograms,
  readCachedMerchant,
  cacheMerchant,
  useOfflineOptional,
} from './src/offline';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardScreen({
  session,
  merchantKey,
  onGoMore,
}: {
  session: Session;
  merchantKey?: number;
  onGoMore?: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.user.role === 'CUSTOMER' || session.user.role === 'SUPER_ADMIN') return;
    setData(null);
    api('/merchants/me/dashboard', { token: session.token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [session, merchantKey]);

  if (session.user.role === 'CUSTOMER') return null;

  const location = [data?.city, data?.country].filter(Boolean).join(', ');
  const programs = data?.programPerformance || data?.activePrograms || [];
  const recentStamps = data?.recentStamps || [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 120 }]}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
            marginBottom: 14,
          }}
        >
          <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Merchant Portal</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {data?.logoUrl ? (
              <LogoImage uri={data.logoUrl} size={52} borderRadius={14} />
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: colors.pink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: '900', fontSize: 22, color: colors.coral }}>
                  {(data?.businessName || 'B').slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.h1, { fontSize: 22, marginBottom: 2 }]}>
                {data?.businessName || 'Dashboard'}
              </Text>
              <Text style={[styles.muted, { marginBottom: 0 }]}>
                {location || data?.category || 'Your business'} · {data?.planDisplayName || data?.plan || '…'}
              </Text>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {data && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'My Customers', value: data.kpis?.totalCustomers ?? 0, icon: 'people' as const },
              {
                label: 'Active Rewards',
                value: data.kpis?.pendingRedemptions ?? 0,
                icon: 'gift' as const,
              },
              {
                label: 'Redeemed / wk',
                value: data.kpis?.rewardsRedeemedWeek ?? 0,
                icon: 'checkmark-circle' as const,
              },
            ].map((k) => (
              <View
                key={k.label}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.06)',
                }}
              >
                <Ionicons name={k.icon} size={16} color={colors.coral} />
                <Text style={{ fontWeight: '900', fontSize: 20, color: colors.ink, marginTop: 6 }}>
                  {k.value}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 }}>
                  {k.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.h2}>Latest stamps issued</Text>
          <Pressable onPress={onGoMore}>
            <Text style={{ color: colors.coral, fontWeight: '800', fontSize: 13 }}>View All</Text>
          </Pressable>
        </View>
        {recentStamps.length ? (
          recentStamps.slice(0, 5).map((s: any) => (
            <Card key={s.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.iconTile}>
                  <Text style={{ fontWeight: '900', color: colors.coral }}>
                    {(s.customerName || '?').slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.customerName || 'Customer'}</Text>
                  <Text style={[styles.muted, { marginBottom: 0 }]}>
                    {s.programTitle || 'Program'} ·{' '}
                    {s.at ? new Date(s.at).toLocaleDateString() : ''}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: colors.coral }}>+{s.stamps || 1}</Text>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={styles.muted}>No stamps yet. Scan a customer QR to start.</Text>
          </Card>
        )}

        {!!programs.length && (
          <>
            <Text style={styles.h2}>Loyalty program performance</Text>
            <Card>
              {programs.slice(0, 5).map((p: any) => (
                <View key={p.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.cardTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={{ fontWeight: '800', color: colors.coral }}>
                      {p.percent ?? p.progress ?? 0}%
                    </Text>
                  </View>
                  <Text style={[styles.muted, { marginBottom: 6 }]}>
                    {p.cards ?? 0} cards · {p.stamps ?? 0} stamps
                  </Text>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: colors.pink,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(100, Number(p.percent ?? p.progress ?? 0))}%`,
                        height: '100%',
                        backgroundColor: colors.coral,
                      }}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={styles.grid}>
          <StatCard icon="heart-outline" label="Stamps / wk" value={data?.kpis?.stampsGivenWeek ?? '—'} />
          <StatCard icon="repeat-outline" label="Returning" value={data?.kpis?.returningCustomers ?? '—'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletScreen({ session }: { session: Session }) {
  const offline = useOfflineOptional();
  const [cards, setCards] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [transfers, setTransfers] = useState<{
    incoming: any[];
    outgoing: any[];
    history: any[];
  }>({ incoming: [], outgoing: [], history: [] });
  const [transferCard, setTransferCard] = useState<any | null>(null);
  const [transferAmount, setTransferAmount] = useState('1');
  const [transferTo, setTransferTo] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api<any[]>('/loyalty/cards/me', { token: session.token })
      .then(async (data) => {
        setCards(data);
        setFromCache(false);
        await offline?.rememberWallet(data);
      })
      .catch(async () => {
        const cached = await readCachedWallet<any[]>();
        if (cached?.data) {
          setCards(cached.data);
          setFromCache(true);
        } else setCards([]);
      });
    api<{ incoming: any[]; outgoing: any[]; history: any[] }>('/loyalty/transfers', {
      token: session.token,
    })
      .then(setTransfers)
      .catch(() => setTransfers({ incoming: [], outgoing: [], history: [] }));
  }

  useEffect(load, [session, offline]);

  async function redeem(cardId: string) {
    if (offline && !offline.online) {
      setMsg('Redeem needs internet — try again when online');
      return;
    }
    try {
      await api('/loyalty/redeem', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ cardId }),
      });
      setMsg('Reward redeemed!');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Redeem failed');
    }
  }

  async function sendTransfer() {
    if (!transferCard) return;
    const amount = Math.max(1, parseInt(transferAmount, 10) || 1);
    const target = transferTo.trim();
    if (!target) {
      setMsg('Enter recipient email or phone');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { cardId: transferCard.id, amount };
      if (target.includes('@')) body.toEmail = target.toLowerCase();
      else body.toPhone = target;
      await api('/loyalty/transfers', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify(body),
      });
      setMsg('Transfer sent — waiting for accept (48h).');
      setTransferCard(null);
      setTransferTo('');
      setTransferAmount('1');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  }

  async function respondTransfer(id: string, action: 'accept' | 'decline' | 'cancel') {
    try {
      await api(`/loyalty/transfers/${id}/${action}`, {
        method: 'POST',
        token: session.token,
      });
      setMsg(
        action === 'accept'
          ? 'Accepted — expiry matches original earner.'
          : action === 'decline'
            ? 'Declined — returned to sender.'
            : 'Cancelled — stamps back on your card.',
      );
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title="My cards" subtitle="Collect stamps and unlock rewards" />
        <OfflineBanner token={session.token} />
        {fromCache && (
          <Text style={[styles.badge, { marginBottom: 8 }]}>Showing cached cards (offline)</Text>
        )}
        {!!msg && <Text style={styles.badge}>{msg}</Text>}

        {(transfers.incoming.length > 0 || transfers.outgoing.length > 0) && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: '800', color: colors.ink, marginBottom: 4 }}>
              Stamp transfers
            </Text>
            <Text style={[styles.muted, { marginBottom: 10 }]}>
              Same business only. 48h to accept or stamps stay with sender. Expiry keeps original
              date.
            </Text>
            {transfers.incoming.map((t) => (
              <View
                key={t.id}
                style={{
                  marginBottom: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.pink,
                  borderWidth: 1,
                  borderColor: colors.pinkDeep,
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.ink }}>
                  {t.fromUser?.name} → you · {t.amount} stamp{t.amount === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.muted, { marginBottom: 8 }]}>
                  {t.merchant?.businessName}
                  {t.stampExpiresAt
                    ? ` · expire ${new Date(t.stampExpiresAt).toLocaleDateString()}`
                    : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <PrimaryButton label="Accept" onPress={() => respondTransfer(t.id, 'accept')} />
                  <Pressable
                    onPress={() => respondTransfer(t.id, 'decline')}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: colors.ink }}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {transfers.outgoing.map((t) => (
              <View
                key={t.id}
                style={{
                  marginBottom: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.ink }}>
                  Pending → {t.toUser?.name} · {t.amount}
                </Text>
                <Text style={[styles.muted, { marginBottom: 8 }]}>{t.merchant?.businessName}</Text>
                <Pressable onPress={() => respondTransfer(t.id, 'cancel')}>
                  <Text style={{ fontWeight: '700', color: colors.coral }}>Cancel transfer</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        {transferCard && (
          <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={() => !busy && setTransferCard(null)}
          >
            <KeyboardAvoidingView
              style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <Pressable style={{ flex: 1 }} onPress={() => !busy && setTransferCard(null)} />
              <View
                style={{
                  backgroundColor: colors.white,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: Platform.OS === 'ios' ? 34 : 20,
                }}
              >
                <View
                  style={{
                    alignSelf: 'center',
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.border,
                    marginBottom: 14,
                  }}
                />
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>
                  Transfer stamps
                </Text>
                <Text style={{ fontWeight: '700', color: colors.coral, marginTop: 4 }}>
                  {transferCard.program?.merchant?.businessName || transferCard.program?.title}
                </Text>
                <Text style={[styles.muted, { marginTop: 6, marginBottom: 12 }]}>
                  Available: {transferCard.stampCount} stamps
                  {transferCard.expiresAt
                    ? ` · expiry ${new Date(transferCard.expiresAt).toLocaleDateString()}`
                    : ''}
                  . Recipient must accept within 48h.
                </Text>
                <Text style={styles.sectionLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  autoFocus
                />
                <Text style={styles.sectionLabel}>Recipient email or phone</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  value={transferTo}
                  onChangeText={setTransferTo}
                  placeholder="friend@email.com or +977…"
                  placeholderTextColor={colors.muted}
                />
                <PrimaryButton
                  label={busy ? 'Sending…' : 'Send transfer'}
                  onPress={sendTransfer}
                  disabled={busy}
                />
                <Pressable
                  onPress={() => setTransferCard(null)}
                  disabled={busy}
                  style={{ marginTop: 12, paddingVertical: 8 }}
                >
                  <Text style={{ fontWeight: '700', color: colors.muted, textAlign: 'center' }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {cards.map((c) => {
          const m = c.program?.merchant;
          return (
            <View key={c.id} style={{ marginBottom: 16 }}>
              <StampCardPreview
                businessName={c.program.businessName || m?.businessName || c.program.title}
                categorySlug={c.program.categorySlug || undefined}
                categoryLabel={
                  c.program.categorySlug
                    ? categoryLabelFromSlug(c.program.categorySlug)
                    : m?.category
                }
                logoUrl={c.program.logoUrl || m?.logoUrl || undefined}
                promoImageUrl={c.program.promoImageUrl || undefined}
                logoScale={c.program.logoScale ?? 1}
                logoOffsetX={c.program.logoOffsetX ?? 0}
                logoOffsetY={c.program.logoOffsetY ?? 0}
                logoPosX={c.program.logoPosX ?? 50}
                logoPosY={c.program.logoPosY ?? 32}
                tagline={m?.tagline || undefined}
                totalStamps={c.program.totalStamps}
                filledStamps={c.stampCount}
                rewardTitle={c.program.rewardTitle}
                rewardDescription={c.program.rewardDescription || undefined}
                stampColor={c.program.stampColor || undefined}
                emptyStampColor={c.program.emptyStampColor || undefined}
                accentColor={c.program.accentColor || undefined}
                fontStyle={c.program.fontStyle || undefined}
                doubleSided={c.program.doubleSided !== false}
                profile={{
                  phone: m?.phone,
                  email: m?.email,
                  website: m?.website,
                  address: m?.address,
                  city: m?.city,
                  facebook: m?.facebook,
                  instagram: m?.instagram,
                  tiktok: m?.tiktok,
                  tagline: m?.tagline,
                  slug: m?.slug,
                }}
              />
              <Text style={[styles.muted, { marginTop: 8, marginBottom: 4 }]}>
                {c.stampCount}/{c.program.totalStamps} · {c.program.rewardTitle}
                {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
              </Text>
              {c.availableRewards > 0 && (
                <>
                  <Text style={styles.badge}>{c.availableRewards} reward ready</Text>
                  <PrimaryButton label="Redeem reward" arrow onPress={() => redeem(c.id)} />
                </>
              )}
              {c.stampCount > 0 && (
                <Pressable
                  onPress={() => {
                    setTransferCard(c);
                    setTransferAmount('1');
                    setTransferTo('');
                  }}
                  style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.coral,
                  }}
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.coral} />
                  <Text style={{ fontWeight: '800', color: colors.coral }}>Transfer stamps</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {!cards.length && (
          <Card>
            <Text style={styles.muted}>
              No cards yet — join a program or get scanned at a partner.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MyQrScreen({ session }: { session: Session }) {
  const offline = useOfflineOptional();
  const [qr, setQr] = useState<any>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api('/qr/me', { token: session.token });
        if (cancelled) return;
        setQr(data);
        setFromCache(false);
        await offline?.rememberQr(data);
      } catch {
        const cached = await readCachedMyQr<any>();
        if (!cancelled && cached?.data) {
          setQr(cached.data);
          setFromCache(true);
        } else if (!cancelled && session.user.qrToken) {
          setQr({ qrPayload: `stampperk:customer:${session.user.qrToken}` });
          setFromCache(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, offline]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title="My QR" subtitle="Show this at the counter for stamps" />
        <OfflineBanner token={session.token} />
        {fromCache && (
          <Text style={[styles.badge, { marginBottom: 8 }]}>Showing cached QR (offline)</Text>
        )}
        {qr && (
          <CustomerMyQrCard
            qr={qr}
            memberName={session.user.name}
            token={session.token}
          />
        )}
        {!qr && (
          <Card>
            <Text style={styles.muted}>Connect once to cache your QR for offline use.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CardsScreen({
  session,
  merchantKey,
}: {
  session: Session;
  merchantKey?: number;
}) {
  const offline = useOfflineOptional();
  const [programs, setPrograms] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [wizard, setWizard] = useState<'create-card' | 'edit-card' | null>(null);
  const [essentialsOpen, setEssentialsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const canManage = session.user.role === 'MERCHANT_OWNER';
  const essentialsOk = merchantEssentialsReady(merchant);
  const needsEssentialsGate =
    canManage && (!merchant || (!essentialsOk && programs.length === 0));

  function load() {
    api<any[]>('/loyalty/programs', { token: session.token })
      .then(async (list) => {
        setPrograms(list);
        await offline?.rememberPrograms(list);
      })
      .catch(async () => {
        const cached = await readCachedPrograms<any[]>();
        setPrograms(cached?.data || []);
      });
    api('/merchants/me', { token: session.token })
      .then(async (m) => {
        setMerchant(m);
        await cacheMerchant(m);
      })
      .catch(async () => {
        const cached = await readCachedMerchant<any>();
        setMerchant(cached?.data || null);
      });
  }

  useEffect(load, [session, merchantKey, offline]);

  async function deactivate(id: string) {
    if (offline && !offline.online) {
      setMsg('Deactivate needs internet');
      return;
    }
    try {
      await api(`/loyalty/programs/${id}`, { method: 'DELETE', token: session.token });
      setMsg('Card deactivated');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Deactivate failed');
    }
  }

  async function reactivate(id: string) {
    if (offline && !offline.online) {
      setMsg('Reactivate needs internet');
      return;
    }
    try {
      await api(`/loyalty/programs/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ active: true }),
      });
      setMsg('Card reactivated');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Reactivate failed');
    }
  }

  if (needsEssentialsGate || essentialsOpen) {
    return (
      <MerchantEssentialsSetup
        token={session.token}
        initial={merchant}
        onSaved={async (m) => {
          setMerchant(m);
          setEssentialsOpen(false);
          await cacheMerchant(m);
          if (programs.length === 0) {
            setWizard('create-card');
          } else {
            setMsg('Business profile saved');
            load();
          }
        }}
        onCancel={needsEssentialsGate ? undefined : () => setEssentialsOpen(false)}
      />
    );
  }

  if (wizard) {
    return (
      <MerchantLoyaltyWizard
        mode={wizard}
        token={session.token}
        initial={wizard === 'edit-card' ? editing : null}
        defaults={{
          businessName: merchant?.businessName,
          logoUrl: merchant?.logoUrl,
        }}
        profile={{
          phone: merchant?.phone,
          email: merchant?.email,
          website: merchant?.website,
          address: merchant?.address,
          city: merchant?.city,
          facebook: merchant?.facebook,
          instagram: merchant?.instagram,
          tiktok: merchant?.tiktok,
          deliveryEnabled: merchant?.deliveryEnabled,
          tagline: merchant?.tagline,
          slug: merchant?.slug,
        }}
        onComplete={async ({ program }) => {
          // Offline: queue loyalty card create
          if (offline && (!offline.online || wizard !== 'edit-card')) {
            if (wizard === 'edit-card') {
              throw new Error('Editing a card needs an internet connection');
            }
            try {
              if (offline.online) {
                await api('/loyalty/programs', {
                  method: 'POST',
                  token: session.token,
                  body: JSON.stringify(program),
                });
                return;
              }
            } catch (e) {
              if (!isNetworkError(e) && offline.online) throw e;
            }
            await offline.queueCreateProgram({ program });
            return;
          }

          if (wizard === 'edit-card' && editing?.id) {
            await api(`/loyalty/programs/${editing.id}`, {
              method: 'PATCH',
              token: session.token,
              body: JSON.stringify(program),
            });
          } else {
            try {
              await api('/loyalty/programs', {
                method: 'POST',
                token: session.token,
                body: JSON.stringify(program),
              });
            } catch (e) {
              if (isNetworkError(e) && offline) {
                await offline.queueCreateProgram({ program });
                return;
              }
              throw e;
            }
          }
        }}
        onDone={() => {
          setWizard(null);
          setEditing(null);
          setMsg(
            offline && !offline.online
              ? 'Loyalty card saved offline — will publish when online'
              : wizard === 'edit-card'
                ? 'Loyalty card updated'
                : 'Loyalty card created',
          );
          load();
          offline?.refreshPending();
        }}
        onCancel={() => {
          setWizard(null);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader
          title="Loyalty cards"
          subtitle="Create, edit, and manage stamp cards — works offline"
        />
        <OfflineBanner token={session.token} />
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        {canManage && !essentialsOk && (
          <Text style={[styles.muted, { marginBottom: 10 }]}>
            Finish your business profile (logo, phone, city) before creating more cards.
          </Text>
        )}
        {canManage && (
          <PrimaryButton
            label={
              !merchant || !essentialsOk
                ? 'Complete business profile'
                : 'Create loyalty card'
            }
            onPress={() => {
              setEditing(null);
              if (!merchant || !essentialsOk) {
                setEssentialsOpen(true);
                return;
              }
              setWizard('create-card');
            }}
          />
        )}
        {programs.map((p) => (
          <View key={p.id} style={{ marginBottom: 16 }}>
            <StampCardPreview
              businessName={p.businessName || merchant?.businessName || p.title}
              categorySlug={p.categorySlug || undefined}
              categoryLabel={
                p.categorySlug
                  ? categoryLabelFromSlug(p.categorySlug)
                  : merchant?.category
              }
              logoUrl={p.logoUrl || merchant?.logoUrl || undefined}
              promoImageUrl={p.promoImageUrl || undefined}
              logoScale={p.logoScale ?? 1}
              logoOffsetX={p.logoOffsetX ?? 0}
              logoOffsetY={p.logoOffsetY ?? 0}
              logoPosX={p.logoPosX ?? 50}
              logoPosY={p.logoPosY ?? 32}
              tagline={merchant?.tagline || undefined}
              totalStamps={p.totalStamps}
              filledStamps={Math.min(3, Math.max(0, p.totalStamps - 1))}
              rewardTitle={p.rewardTitle}
              rewardDescription={p.rewardDescription || undefined}
              stampColor={p.stampColor || undefined}
              emptyStampColor={p.emptyStampColor || undefined}
              accentColor={p.accentColor || undefined}
              fontStyle={p.fontStyle || undefined}
              doubleSided={p.doubleSided !== false}
              profile={merchant || undefined}
              expiryLabel={
                p.expiresAt
                  ? String(p.expiresAt).slice(0, 10)
                  : p.expiryDays
                    ? `${p.expiryDays} days`
                    : undefined
              }
            />
            <View style={[styles.row, { marginTop: 10, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={[styles.muted, { marginBottom: 0 }]}>
                  {(p.cardType || 'CLASSIC')} · {p.active === false ? 'Inactive' : 'Active'}
                </Text>
              </View>
            </View>
            {canManage && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <Pressable
                  onPress={() => {
                    setEditing(p);
                    setWizard('edit-card');
                  }}
                  style={{
                    backgroundColor: colors.pink,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: colors.ink, fontSize: 12 }}>Edit</Text>
                </Pressable>
                {p.active !== false ? (
                  <Pressable
                    onPress={() => deactivate(p.id)}
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: '#B91C1C', fontSize: 12 }}>
                      Deactivate
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => reactivate(p.id)}
                    style={{
                      backgroundColor: '#D1FAE5',
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: '#047857', fontSize: 12 }}>
                      Reactivate
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        ))}
        {!programs.length && (
          <Card>
            <Text style={styles.muted}>
              {canManage
                ? 'No loyalty programs yet. Tap Create to start the guided setup.'
                : 'No loyalty programs yet.'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CampaignsScreen({
  session,
  merchantKey,
}: {
  session: Session;
  merchantKey?: number;
}) {
  const [data, setData] = useState<any>(null);
  const [sends, setSends] = useState<any[]>([]);
  const [mode, setMode] = useState<'hub' | 'create-offer' | 'push'>('hub');
  const [presetId, setPresetId] = useState('seasonal');
  const [title, setTitle] = useState('Weekend special');
  const [description, setDescription] = useState('Come back this weekend for 20% off.');
  const [badgeText, setBadgeText] = useState('20% OFF');
  const [offerType, setOfferType] = useState<'PERCENTAGE' | 'FIXED' | 'FREE_ITEM' | 'CUSTOM'>('PERCENTAGE');
  const [msg, setMsg] = useState('');
  const canCreate = session.user.role === 'MERCHANT_OWNER';

  function load() {
    api('/campaigns', { token: session.token }).then(setData).catch(() => undefined);
    if (canCreate) {
      api<any[]>('/notifications/merchant/sends', { token: session.token })
        .then(setSends)
        .catch(() => setSends([]));
    }
  }
  useEffect(load, [session, canCreate, merchantKey]);

  function applyPreset(id: string) {
    setPresetId(id);
    const p = REWARD_CAMPAIGN_TYPES.find((x) => x.id === id);
    if (!p) return;
    setTitle(p.label.slice(0, 40));
    setDescription(p.description.slice(0, 100));
    setBadgeText(p.badge.slice(0, 12));
    setOfferType(p.offerType);
  }

  async function create() {
    try {
      await api('/campaigns', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          title,
          description,
          badgeText,
          offerType,
          discountValue: offerType === 'PERCENTAGE' ? 20 : 100,
          status: 'ACTIVE',
          campaignPreset: presetId || undefined,
        }),
      });
      setMsg('Campaign published');
      setMode('hub');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (mode === 'push') {
    return (
      <PushSendWizard
        token={session.token}
        onCancel={() => setMode('hub')}
        onDone={() => {
          setMsg('Message sent');
          setMode('hub');
          load();
        }}
      />
    );
  }

  if (mode === 'create-offer') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <KeyboardAwareScroll contentContainerStyle={styles.pad} bottomExtra={100}>
          <Pressable onPress={() => setMode('hub')}>
            <Text style={{ color: colors.coral, fontWeight: '800', marginBottom: 12 }}>← Back</Text>
          </Pressable>
          <Text style={styles.h1}>Create an offer</Text>
          <Card>
            <Text style={styles.sectionLabel}>Campaign type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REWARD_CAMPAIGN_TYPES.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => applyPreset(p.id)}
                  style={[styles.chip, presetId === p.id && styles.chipOn]}
                >
                  <Text style={presetId === p.id ? styles.chipTextOn : styles.chipText}>{p.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} />
            <PrimaryButton label="Publish campaign" arrow onPress={create} />
          </Card>
          {!!msg && <Text style={styles.badge}>{msg}</Text>}
        </KeyboardAwareScroll>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.heroCard}>
          <Text style={styles.h1}>
            Create campaigns that <Text style={{ color: colors.coral }}>bring customers back</Text>
          </Text>
          <Text style={[styles.muted, { marginBottom: 0 }]}>
            Build offers, share updates, and keep your customers engaged.
          </Text>
        </View>

        {canCreate && (
          <>
            <Pressable onPress={() => setMode('create-offer')} style={{ marginBottom: 10 }}>
              <Card>
                <View style={styles.row}>
                  <View style={styles.iconTile}>
                    <Ionicons name="megaphone-outline" size={18} color={colors.coral} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Create an offer</Text>
                    <Text style={[styles.muted, { marginBottom: 0 }]}>
                      Discounts, visual campaigns, targeting, and analytics.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
            <Pressable onPress={() => setMode('push')} style={{ marginBottom: 10 }}>
              <Card>
                <View style={styles.row}>
                  <View style={styles.iconTile}>
                    <Ionicons name="rocket-outline" size={18} color={colors.coral} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Send a notification</Text>
                    <Text style={[styles.muted, { marginBottom: 0 }]}>
                      Share offers, loyalty cards, or messages with customers.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          </>
        )}

        {!!msg && <Text style={styles.badge}>{msg}</Text>}

        {canCreate && (
          <>
            <Text style={styles.h2}>Recent messages</Text>
            {sends.slice(0, 5).map((s) => (
              <Card key={s.id}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={[styles.muted, { marginBottom: 0 }]}>
                  {s.contentType} · sent {s.sentCount}/{s.estimatedCount}
                </Text>
              </Card>
            ))}
            {!sends.length && (
              <Card>
                <Text style={styles.muted}>No messages yet. Tap Send a notification to start.</Text>
              </Card>
            )}
          </>
        )}

        <Text style={styles.h2}>Active campaigns</Text>
        {data?.campaigns?.map((c: any) => (
          <Card key={c.id}>
            <View style={styles.row}>
              <View style={styles.iconTile}>
                <Ionicons name="megaphone-outline" size={18} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={[styles.muted, { marginBottom: 0 }]}>
                  {c.badgeText} · {c.status}
                </Text>
              </View>
            </View>
          </Card>
        ))}
        {!data?.campaigns?.length && (
          <Card>
            <Text style={styles.muted}>No campaigns yet.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({
  session,
  locale,
  setLocale,
  onLogout,
  pushToken,
  merchantKey,
  onSwitchToCustomer,
}: {
  session: Session;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onLogout: () => void;
  pushToken: string | null;
  merchantKey?: number;
  onSwitchToCustomer?: () => void;
}) {
  const t = strings[locale];
  const [qr, setQr] = useState<any>(null);
  const [billingMsg, setBillingMsg] = useState('');
  const [name, setName] = useState(session.user.name);
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [securityOpen, setSecurityOpen] = useState(false);
  const [verifiedOpen, setVerifiedOpen] = useState(false);
  const showQr = session.user.role === 'CUSTOMER';
  const showBilling = session.user.role === 'MERCHANT_OWNER';
  const isAdmin = session.user.role === 'SUPER_ADMIN';
  const isMerchant =
    session.user.role === 'MERCHANT_OWNER' || session.user.role === 'STAFF';
  const canEditBusiness = session.user.role === 'MERCHANT_OWNER';

  useEffect(() => {
    if (!showQr) return;
    api('/qr/me', { token: session.token }).then(setQr).catch(() => undefined);
  }, [session, showQr]);

  useEffect(() => {
    if (!showQr) return;
    api<any>('/auth/me', { token: session.token })
      .then((me) => {
        setName(me.name || session.user.name);
        setPhone(me.phone || '');
        setDateOfBirth(me.dateOfBirth ? String(me.dateOfBirth).slice(0, 10) : '');
      })
      .catch(() => undefined);
  }, [session, showQr]);

  async function upgrade() {
    const res = await api<any>('/billing/checkout', {
      method: 'POST',
      token: session.token,
      body: JSON.stringify({ plan: 'YEARLY' }),
    });
    setBillingMsg(res.mode === 'mock' ? 'Upgraded to YEARLY (mock)' : 'Checkout ready');
  }

  async function saveCustomerProfile() {
    try {
      await api('/users/me', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          name,
          phone,
          dateOfBirth: dateOfBirth || '',
        }),
      });
      setBillingMsg('Profile saved');
    } catch (e) {
      setBillingMsg(e instanceof Error ? e.message : 'Save failed');
    }
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

  if (verifiedOpen) {
    return (
      <VerifiedBadgeScreen session={session} onBack={() => setVerifiedOpen(false)} />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAwareScroll contentContainerStyle={styles.pad} bottomExtra={140}>
        <ScreenHeader title="Settings" subtitle={`${session.user.name} · ${session.user.role}`} />

        {isMerchant && onSwitchToCustomer && (
          <Pressable
            onPress={onSwitchToCustomer}
            style={{
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.pink,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.pinkDeep,
            }}
          >
            <Ionicons name="person" size={20} color={colors.coral} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: colors.ink }}>Switch to Customer mode</Text>
              <Text style={[styles.muted, { marginBottom: 0 }]}>
                Collect stamps at other businesses. Customers cannot open Business mode.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.coral} />
          </Pressable>
        )}

        {isMerchant && (
          <MerchantBusinessProfile
            token={session.token}
            canEdit={canEditBusiness}
            merchantKey={merchantKey}
          />
        )}

        <Card style={{ backgroundColor: colors.pink, borderColor: colors.pinkDeep }}>
          <View style={styles.row}>
            <View style={[styles.iconTile, { backgroundColor: colors.white }]}>
              <Ionicons name="globe-outline" size={18} color={colors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{session.user.email}</Text>
              <Text style={[styles.muted, { marginBottom: 0 }]}>
                {isAdmin
                  ? 'Super Admin · full platform access'
                  : pushToken
                    ? `Push ready · ${pushToken.slice(0, 18)}…`
                    : 'Signed in on this device'}
              </Text>
            </View>
          </View>
        </Card>

        {showQr && (
          <>
            <Text style={styles.sectionLabel}>My Profile</Text>
            <Card>
              <Text style={styles.muted}>Full name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
              <Text style={styles.muted}>Mobile number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.muted}>Date of birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="1995-01-15"
              />
              <Pressable style={[styles.btn, { marginTop: 8 }]} onPress={saveCustomerProfile}>
                <Text style={styles.btnText}>Save profile</Text>
              </Pressable>
            </Card>

            <Text style={styles.sectionLabel}>Loyalty</Text>
            <Card>
              <Text style={styles.cardTitle}>{t.myQr}</Text>
              {qr && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <QRCode value={qr.qrPayload} size={160} color={colors.coral} />
                </View>
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>{t.language}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {LOCALE_OPTIONS.map((lang) => (
            <Pressable
              key={lang.code}
              style={[styles.chip, locale === lang.code && styles.chipOn]}
              onPress={() => setLocale(lang.code)}
            >
              {locale === lang.code && (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              )}
              <Text style={locale === lang.code ? styles.chipTextOn : styles.chipText}>
                {lang.native}
                {lang.dir === 'rtl' ? ' RTL' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <Card style={{ paddingVertical: 4 }}>
          <SettingRow
            icon="lock-closed-outline"
            title="Security"
            subtitle="Devices, login history, logout all"
            onPress={() => setSecurityOpen(true)}
          />
          {showBilling && (
            <SettingRow
              icon="checkmark-circle-outline"
              title="Stamp Perk Verified"
              subtitle="Trust badge · Discover boost"
              onPress={() => setVerifiedOpen(true)}
            />
          )}
          {showBilling && (
            <SettingRow
              icon="calendar-outline"
              title="Manage subscription"
              subtitle="Upgrade plan and billing"
              onPress={upgrade}
            />
          )}
          <SettingRow
            icon="download-outline"
            title="Export my data"
            subtitle="GDPR data export"
            onPress={async () => {
              await api('/privacy/export', { method: 'POST', token: session.token });
              setBillingMsg('GDPR export completed');
            }}
          />
          <SettingRow
            icon="log-out-outline"
            title="Sign out"
            subtitle="Sign out from this device"
            danger
            last
            onPress={onLogout}
          />
        </Card>
        {!!billingMsg && <Text style={styles.badge}>{billingMsg}</Text>}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

function RoleTabs({
  session,
  locale,
  setLocale,
  onLogout,
  pushToken,
  merchantKey,
  onBusinessSwitch,
}: {
  session: Session;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onLogout: () => void;
  pushToken: string | null;
  merchantKey: number;
  onBusinessSwitch: () => void;
}) {
  const t = strings[locale];
  const role = session.user.role;
  const [appMode, setMode] = useState<AppMode>(
    canUseBusinessMode(role) ? 'business' : 'customer',
  );
  const [modeReady, setModeReady] = useState(!canUseBusinessMode(role));

  useEffect(() => {
    let cancelled = false;
    getAppMode(role).then((m) => {
      if (!cancelled) {
        setMode(m);
        setModeReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [role, session.user.id]);

  async function switchMode(next: AppMode) {
    const saved = await setAppMode(role, next);
    setMode(saved);
  }

  const customerExperience =
    role === 'CUSTOMER' || (canUseBusinessMode(role) && appMode === 'customer');

  const profile = () =>
    customerExperience ? (
      <CustomerProfileScreen
        session={session}
        locale={locale}
        setLocale={setLocale}
        onLogout={onLogout}
        onSwitchToBusiness={
          canUseBusinessMode(role) ? () => void switchMode('business') : undefined
        }
      />
    ) : (
      <ProfileScreen
        session={session}
        locale={locale}
        setLocale={setLocale}
        onLogout={onLogout}
        pushToken={pushToken}
        merchantKey={merchantKey}
        onSwitchToCustomer={() => void switchMode('customer')}
      />
    );

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.coral,
    tabBarInactiveTintColor: colors.muted,
  };

  if (!modeReady) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  if (role === 'SUPER_ADMIN') {
    return (
      <Tab.Navigator tabBar={(props) => <StampPerkTabBar {...props} />} screenOptions={screenOptions}>
        <Tab.Screen name="Dashboard" options={{ title: t.dashboard }}>
          {({ navigation }) => (
            <AdminDashboardScreen
              session={session}
              onGoMerchants={() => navigation.navigate('Merchants')}
              onGoApprovals={() => navigation.navigate('Approvals')}
              onGoBilling={() => navigation.navigate('More')}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Merchants" options={{ title: 'Merchants' }}>
          {() => <AdminManageScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Approvals" options={{ title: 'Approve' }}>
          {() => <AdminApprovalsScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Profile" options={{ title: t.profile }}>
          {profile}
        </Tab.Screen>
        <Tab.Screen name="More" options={{ title: 'More' }}>
          {() => <AdminMoreStack session={session} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  if (customerExperience) {
    return (
      <Tab.Navigator
        key={`customer-${appMode}`}
        tabBar={(props) => <StampPerkTabBar {...props} />}
        screenOptions={screenOptions}
      >
        <Tab.Screen name="Home" options={{ title: 'Home' }}>
          {({ navigation }) => (
            <CustomerHomeScreen
              session={session}
              onGoCards={() => navigation.navigate('Cards')}
              onGoRewards={() => navigation.navigate('Rewards')}
              onGoDiscover={() => navigation.navigate('Discover')}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Discover" options={{ title: 'Discover' }}>
          {() => <DiscoverScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="MyQR" options={{ title: t.myQr }}>
          {() => <MyQrScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Rewards" options={{ title: 'Rewards' }}>
          {() => <CustomerRewardsScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Profile" options={{ title: t.profile }}>
          {profile}
        </Tab.Screen>
        <Tab.Screen
          name="Cards"
          options={{
            title: t.cards,
            tabBarItemStyle: { display: 'none' },
          }}
        >
          {() => <WalletScreen session={session} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  // MERCHANT_OWNER + STAFF — business mode
  return (
    <Tab.Navigator
      key="business"
      tabBar={(props) => <StampPerkTabBar {...props} />}
      screenOptions={screenOptions}
    >
      <Tab.Screen name="Dashboard" options={{ title: t.dashboard }}>
        {({ navigation }) => (
          <DashboardScreen
            session={session}
            merchantKey={merchantKey}
            onGoMore={() => navigation.navigate('More', { screen: 'Stamps' })}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Cards" options={{ title: t.cards }}>
        {() =>
          role === 'MERCHANT_OWNER' ? (
            <CardsScreen session={session} merchantKey={merchantKey} />
          ) : (
            <SafeAreaView style={styles.screen} edges={['top']}>
              <ScrollView contentContainerStyle={styles.pad}>
                <ScreenHeader
                  title="Cards"
                  subtitle="Loyalty programs are managed by the business owner."
                />
              </ScrollView>
            </SafeAreaView>
          )
        }
      </Tab.Screen>
      <Tab.Screen name="Scan" options={{ title: t.scan }}>
        {() => (
          <SafeAreaView style={styles.screen} edges={['top']}>
            <ScanScreen session={session} />
          </SafeAreaView>
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: t.profile }}>
        {profile}
      </Tab.Screen>
      <Tab.Screen name="More" options={{ title: 'More' }}>
        {() => (
          <MerchantMoreStack
            session={session}
            merchantKey={merchantKey}
            isOwner={role === 'MERCHANT_OWNER'}
            onBusinessSwitch={onBusinessSwitch}
            CampaignsScreen={CampaignsScreen}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [locale, setLocale] = useState<Locale>('en');
  const [merchantKey, setMerchantKey] = useState(0);
  const { pushToken } = usePushRegistration(session?.token || null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('stampperk_session');
      const loc = await AsyncStorage.getItem('stampperk_locale');
      if (raw) setSession(JSON.parse(raw));
      if (loc && loc in strings) {
        setLocale(loc as Locale);
        applyLocaleDirection(loc as Locale);
      }
      setBooting(false);
    })();
  }, []);

  async function persist(s: Session | null) {
    setSession(s);
    if (s) await AsyncStorage.setItem('stampperk_session', JSON.stringify(s));
    else {
      await AsyncStorage.removeItem('stampperk_session');
      await setActiveMerchantId(null);
    }
  }

  function onBusinessSwitch() {
    setMerchantKey((k) => k + 1);
  }

  async function changeLocale(l: Locale) {
    setLocale(l);
    await AsyncStorage.setItem('stampperk_locale', l);
    const needsReload = applyLocaleDirection(l);
    if (session) {
      try {
        await api('/users/me', {
          method: 'PATCH',
          token: session.token,
          body: JSON.stringify({ language: l }),
        });
      } catch {
        /* ignore */
      }
    }
    reloadForRtlIfNeeded(needsReload);
  }

  if (booting) {
    return (
      <SafeAreaProvider>
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.coral} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, direction: isRtlLocale(locale) ? 'rtl' : 'ltr' }}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!session ? (
              <Stack.Screen name="Login">
                {() => <LoginScreen locale={locale} onLoggedIn={(s) => persist(s)} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Main">
                {() => (
                  <OfflineProvider token={session.token}>
                    <RoleTabs
                      session={session}
                      locale={locale}
                      setLocale={changeLocale}
                      onLogout={() => persist(null)}
                      pushToken={pushToken}
                      merchantKey={merchantKey}
                      onBusinessSwitch={onBusinessSwitch}
                    />
                  </OfflineProvider>
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
