import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors, styles } from '../theme';
import { Card, PrimaryButton, ScreenHeader, StatCard } from '../ui';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { LogoImage } from '../components/LogoImage';

type Session = { token: string; user: { name: string; email: string; role: string } };

export type AdminOverview = {
  activeMerchants: number;
  activeMerchantCount?: number;
  customers: number;
  stamps: number;
  redemptions: number;
  payingMerchants: number;
  loyaltyPrograms?: number;
  systemHealth?: string;
  trends?: {
    merchants: number;
    customers: number;
    stamps: number;
    redemptions: number;
  };
  stampSeries?: { label: string; count: number }[];
  categories?: { name: string; count: number; percent: number }[];
  recentMerchants?: MerchantRow[];
  activity?: { type: string; title: string; detail: string; at: string }[];
  platform?: {
    activeMerchants: number;
    loyaltyPrograms: number;
    payingMerchants: number;
    stampsThisMonth: number;
    redemptionsThisMonth: number;
  };
};

export type MerchantRow = {
  id: string;
  businessName: string;
  status: string;
  slug: string;
  logoUrl?: string | null;
  category?: string;
  city?: string | null;
  country?: string;
  createdAt?: string;
  owner?: { email?: string; name?: string };
  subscription?: { plan?: string; status?: string };
};

export type UserRow = {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  role: string;
  language?: string;
  currency?: string;
  createdAt: string;
};

export type SubRow = {
  id: string;
  plan: string;
  status: string;
  provider?: string;
  updatedAt: string;
  merchant?: { businessName?: string; slug?: string; logoUrl?: string | null };
};

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Trend({ value }: { value?: number }) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <Text style={{ color: up ? colors.success : '#B91C1C', fontWeight: '800', fontSize: 12 }}>
      {up ? '↑' : '↓'} {Math.abs(v)}%
    </Text>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: '#D1FAE5', fg: '#059669' },
    PENDING: { bg: '#FFEDD5', fg: '#EA580C' },
    SUSPENDED: { bg: '#FEE2E2', fg: '#B91C1C' },
  };
  const c = map[status] || { bg: colors.pink, fg: colors.coral };
  return (
    <Text
      style={{
        backgroundColor: c.bg,
        color: c.fg,
        overflow: 'hidden',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        fontWeight: '800',
        fontSize: 11,
        alignSelf: 'flex-start',
      }}
    >
      {status}
    </Text>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MiniBarChart({ series }: { series: { label: string; count: number }[] }) {
  const max = Math.max(...series.map((s) => s.count), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 88, marginTop: 8 }}>
      {series.map((s, i) => (
        <View key={`${s.label}-${i}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: '100%',
              height: Math.max(4, (s.count / max) * 72),
              borderRadius: 6,
              backgroundColor: i === series.length - 1 ? colors.coral : colors.pinkDeep,
            }}
          />
        </View>
      ))}
    </View>
  );
}

async function patchMerchantStatus(
  token: string,
  id: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING',
) {
  await api(`/admin/merchants/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}

export function AdminDashboardScreen({
  session,
  onGoMerchants,
  onGoApprovals,
  onGoBilling,
}: {
  session: Session;
  onGoMerchants?: () => void;
  onGoApprovals?: () => void;
  onGoBilling?: () => void;
}) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api<AdminOverview>('/admin/overview', { token: session.token });
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function approve(id: string) {
    try {
      await patchMerchantStatus(session.token, id, 'ACTIVE');
      setActionMsg('Merchant approved');
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Approve failed');
    }
  }

  const pending = (overview?.recentMerchants || []).filter((m) => m.status === 'PENDING');
  const first = session.user.name?.split(' ')[0] || 'Admin';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}
      >
        <View style={styles.heroCard}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <View>
              <Text style={styles.sectionLabel}>Admin Panel</Text>
              <Text style={[styles.muted, { marginBottom: 0 }]}>Stamp Perk · Super Admin</Text>
            </View>
            <View style={[styles.iconTile, { width: 44, height: 44, borderRadius: 22 }]}>
              <Text style={{ fontWeight: '900', color: colors.coral, fontSize: 18 }}>
                {(session.user.name || 'A').slice(0, 1)}
              </Text>
            </View>
          </View>
          <Text style={styles.h1}>Welcome back, {first}!</Text>
          <Text style={[styles.muted, { marginBottom: 0 }]}>
            {session.user.name || 'Admin User'} · platform health · pull to refresh
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!actionMsg && <Text style={styles.badge}>{actionMsg}</Text>}

        {!overview && !error ? (
          <ActivityIndicator color={colors.coral} style={{ marginVertical: 24 }} />
        ) : null}

        {overview && (
          <>
            <View style={styles.grid}>
              <View style={[styles.card, { width: '47%', marginBottom: 0 }]}>
                <View style={styles.row}>
                  <View style={styles.iconTile}>
                    <Ionicons name="storefront-outline" size={18} color={colors.coral} />
                  </View>
                  <Trend value={overview.trends?.merchants} />
                </View>
                <Text style={styles.kpi}>{formatCompact(overview.activeMerchants)}</Text>
                <Text style={styles.kpiLabel}>Total merchants</Text>
              </View>
              <View style={[styles.card, { width: '47%', marginBottom: 0 }]}>
                <View style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="people-outline" size={18} color="#7C3AED" />
                  </View>
                  <Trend value={overview.trends?.customers} />
                </View>
                <Text style={styles.kpi}>{formatCompact(overview.customers)}</Text>
                <Text style={styles.kpiLabel}>Total customers</Text>
              </View>
              <View style={[styles.card, { width: '47%', marginBottom: 0 }]}>
                <View style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: '#FFEDD5' }]}>
                    <Ionicons name="ellipse-outline" size={18} color="#EA580C" />
                  </View>
                  <Trend value={overview.trends?.stamps} />
                </View>
                <Text style={styles.kpi}>{formatCompact(overview.stamps)}</Text>
                <Text style={styles.kpiLabel}>Stamps issued</Text>
              </View>
              <View style={[styles.card, { width: '47%', marginBottom: 0 }]}>
                <View style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="gift-outline" size={18} color="#059669" />
                  </View>
                  <Trend value={overview.trends?.redemptions} />
                </View>
                <Text style={styles.kpi}>{formatCompact(overview.redemptions)}</Text>
                <Text style={styles.kpiLabel}>Rewards redeemed</Text>
              </View>
            </View>

            <Text style={styles.h2}>Stamp transactions overview</Text>
            <Card>
              {overview.stampSeries?.length ? (
                <>
                  <MiniBarChart series={overview.stampSeries} />
                  {(() => {
                    const peak = overview.stampSeries.reduce(
                      (best, s) => (s.count >= best.count ? s : best),
                      overview.stampSeries[0],
                    );
                    const today = overview.stampSeries[overview.stampSeries.length - 1];
                    return (
                      <View style={{ marginTop: 10, gap: 4 }}>
                        <Text style={[styles.muted, { marginBottom: 0 }]}>
                          Today: <Text style={{ fontWeight: '800', color: colors.ink }}>{today?.count ?? 0}</Text> stamps
                        </Text>
                        <Text style={[styles.muted, { marginBottom: 0 }]}>
                          Peak day: <Text style={{ fontWeight: '800', color: colors.coral }}>{peak.label}</Text> ·{' '}
                          {peak.count} stamps
                        </Text>
                      </View>
                    );
                  })()}
                </>
              ) : (
                <Text style={styles.muted}>No stamp activity yet</Text>
              )}
            </Card>

            <Text style={styles.h2}>Quick actions</Text>
            <View style={{ gap: 8 }}>
              <PrimaryButton label="Manage merchants" arrow onPress={() => onGoMerchants?.()} />
              <PrimaryButton label="Review pending approvals" outline onPress={() => onGoApprovals?.()} />
              <PrimaryButton label="More tools (Users, Billing…)" outline onPress={() => onGoBilling?.()} />
            </View>

            <Text style={styles.h2}>Platform summary</Text>
            <Card>
              {[
                {
                  label: 'Active merchants',
                  value: overview.platform?.activeMerchants ?? overview.activeMerchantCount,
                  trend: overview.trends?.merchants,
                },
                {
                  label: 'Loyalty programs',
                  value: overview.platform?.loyaltyPrograms ?? overview.loyaltyPrograms,
                },
                {
                  label: 'Paying merchants',
                  value: overview.platform?.payingMerchants ?? overview.payingMerchants,
                },
                { label: 'Stamps (30d)', value: overview.platform?.stampsThisMonth },
                { label: 'Redeems (30d)', value: overview.platform?.redemptionsThisMonth },
                { label: 'System health', value: overview.systemHealth || 'ok' },
              ].map((row) => (
                <View
                  key={String(row.label)}
                  style={[styles.row, { justifyContent: 'space-between', paddingVertical: 8 }]}
                >
                  <Text style={styles.muted}>{row.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {typeof row.trend === 'number' ? <Trend value={row.trend} /> : null}
                    <Text style={{ fontWeight: '800', color: colors.ink }}>{String(row.value ?? '—')}</Text>
                  </View>
                </View>
              ))}
            </Card>

            {!!overview.categories?.length && (
              <>
                <Text style={styles.h2}>Top categories</Text>
                <Card>
                  {overview.categories.map((c) => (
                    <View key={c.name} style={{ marginBottom: 10 }}>
                      <View style={[styles.row, { justifyContent: 'space-between' }]}>
                        <Text style={styles.cardTitle}>{c.name}</Text>
                        <Text style={{ fontWeight: '800', color: colors.coral }}>{c.percent}%</Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: colors.pink,
                          marginTop: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${Math.min(100, c.percent)}%`,
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

            {!!pending.length && (
              <>
                <Text style={styles.h2}>Needs approval</Text>
                {pending.map((m) => (
                  <Card key={m.id}>
                    <View style={[styles.row, { justifyContent: 'space-between' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{m.businessName}</Text>
                        <Text style={styles.muted}>
                          {m.category || 'Business'} · {m.owner?.email || '—'}
                        </Text>
                        <StatusPill status={m.status} />
                      </View>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <PrimaryButton label="Approve merchant" arrow onPress={() => approve(m.id)} />
                    </View>
                  </Card>
                ))}
              </>
            )}

            <Text style={styles.h2}>Recent merchants</Text>
            {(overview.recentMerchants || []).map((m) => (
              <Card key={m.id}>
                <View style={styles.row}>
                  <View style={styles.iconTile}>
                    {m.logoUrl ? (
                      <LogoImage uri={m.logoUrl} size={36} borderRadius={10} />
                    ) : (
                      <Text style={{ fontWeight: '900', color: colors.coral }}>
                        {m.businessName.slice(0, 1)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{m.businessName}</Text>
                    <Text style={[styles.muted, { marginBottom: 4 }]}>
                      {m.category || '—'} · {m.subscription?.plan || 'FREE'}
                    </Text>
                    <StatusPill status={m.status} />
                  </View>
                </View>
              </Card>
            ))}
            {!overview.recentMerchants?.length && (
              <Card>
                <Text style={styles.muted}>No merchants yet</Text>
              </Card>
            )}

            <Text style={styles.h2}>Recent activity</Text>
            {(overview.activity || []).map((a, i) => (
              <Card key={`${a.title}-${i}`}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconTile,
                      a.type === 'redeem' && { backgroundColor: '#D1FAE5' },
                      a.type === 'merchant' && { backgroundColor: colors.pink },
                      a.type === 'stamp' && { backgroundColor: '#EDE9FE' },
                    ]}
                  >
                    <Ionicons
                      name={
                        a.type === 'redeem'
                          ? 'gift-outline'
                          : a.type === 'merchant'
                            ? 'storefront-outline'
                            : 'ellipse-outline'
                      }
                      size={16}
                      color={colors.coral}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{a.title}</Text>
                    <Text style={[styles.muted, { marginBottom: 0 }]}>
                      {a.detail} · {timeAgo(a.at)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
            {!overview.activity?.length && (
              <Card>
                <Text style={styles.muted}>No recent activity</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AdminManageScreen({ session }: { session: Session }) {
  const [tab, setTab] = useState<'merchants' | 'users'>('merchants');
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={[styles.chip, tab === 'merchants' && styles.chipOn, { flex: 1, justifyContent: 'center' }]}
              onPress={() => setTab('merchants')}
            >
              <Text style={tab === 'merchants' ? styles.chipTextOn : styles.chipText}>Merchants</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, tab === 'users' && styles.chipOn, { flex: 1, justifyContent: 'center' }]}
              onPress={() => setTab('users')}
            >
              <Text style={tab === 'users' ? styles.chipTextOn : styles.chipText}>Users</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      {tab === 'merchants' ? (
        <AdminMerchantsScreen session={session} embedded />
      ) : (
        <AdminUsersScreen session={session} embedded />
      )}
    </View>
  );
}

export function AdminMerchantsScreen({
  session,
  embedded,
}: {
  session: Session;
  embedded?: boolean;
}) {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ALL');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const rows = await api<MerchantRow[]>('/admin/merchants', { token: session.token });
      setMerchants(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load merchants');
      setMerchants([]);
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    setBusyId(id);
    try {
      await patchMerchantStatus(session.token, id, status);
      setMerchants((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      setMsg(`Updated to ${status}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = merchants.filter((m) => {
    if (filter !== 'ALL' && m.status !== filter) return false;
    if (!q.trim()) return true;
    const hay = `${m.businessName} ${m.slug} ${m.owner?.email || ''} ${m.category || ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={styles.screen} edges={embedded ? [] : ['top']}>
      <KeyboardAwareScroll
        contentContainerStyle={styles.pad}
        bottomExtra={100}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}
      >
        <ScreenHeader
          title="Merchants"
          subtitle={`${merchants.length} businesses · ${merchants.filter((m) => m.status === 'PENDING').length} pending`}
        />
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Search name, email, category…"
          autoCapitalize="none"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, filter === f && styles.chipOn]}
                onPress={() => setFilter(f)}
              >
                <Text style={filter === f ? styles.chipTextOn : styles.chipText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        {filtered.map((m) => (
          <Card key={m.id}>
            <View style={styles.row}>
              <View style={styles.iconTile}>
                {m.logoUrl ? (
                  <LogoImage uri={m.logoUrl} size={36} borderRadius={10} />
                ) : (
                  <Text style={{ fontWeight: '900', color: colors.coral }}>
                    {m.businessName.slice(0, 1)}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{m.businessName}</Text>
                <Text style={styles.muted}>
                  {m.subscription?.plan || 'FREE'} · {m.owner?.email || '—'}
                </Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>
                  /{m.slug}
                  {m.category ? ` · ${m.category}` : ''}
                </Text>
                <StatusPill status={m.status} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={busyId === m.id ? '…' : 'Approve'}
                  onPress={() => setStatus(m.id, 'ACTIVE')}
                  disabled={busyId === m.id}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Pending"
                  outline
                  onPress={() => setStatus(m.id, 'PENDING')}
                  disabled={busyId === m.id}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Suspend"
                  outline
                  onPress={() => setStatus(m.id, 'SUSPENDED')}
                  disabled={busyId === m.id}
                />
              </View>
            </View>
          </Card>
        ))}
        {!filtered.length && !error && (
          <Card>
            <Text style={styles.muted}>No merchants match this filter.</Text>
          </Card>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

export function AdminApprovalsScreen({ session }: { session: Session }) {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [verifications, setVerifications] = useState<
    Array<{
      id: string;
      businessName: string;
      verificationStatus: string;
      owner?: { name?: string; email?: string };
    }>
  >([]);
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await api<MerchantRow[]>('/admin/merchants', { token: session.token }).catch(
      () => [] as MerchantRow[],
    );
    setMerchants(rows.filter((m) => m.status === 'PENDING'));
    const vrows = await api<
      Array<{
        id: string;
        businessName: string;
        verificationStatus: string;
        owner?: { name?: string; email?: string };
      }>
    >('/admin/verifications?status=PENDING', { token: session.token }).catch(() => []);
    setVerifications(vrows);
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    try {
      await patchMerchantStatus(session.token, id, status);
      setMsg(status === 'ACTIVE' ? 'Approved' : 'Suspended');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function reviewVerification(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      await api(`/admin/verifications/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ action }),
      });
      setMsg(`Verification ${action.toLowerCase()}d`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.coral}
          />
        }
      >
        <View style={styles.scanHero}>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 22 }}>Approvals</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            Merchant registrations and Verified Badge KYC.
          </Text>
          <View
            style={{
              marginTop: 14,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="shield-checkmark" size={28} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 28 }}>
              {merchants.length + verifications.length}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>pending</Text>
          </View>
        </View>
        {!!msg && <Text style={styles.badge}>{msg}</Text>}

        <Text style={styles.sectionLabel}>Verified Badge</Text>
        {verifications.map((v) => (
          <Card key={v.id}>
            <Text style={styles.cardTitle}>{v.businessName}</Text>
            <Text style={styles.muted}>
              {v.owner?.name || '—'} · {v.owner?.email || '—'}
            </Text>
            <PrimaryButton label="Approve KYC" arrow onPress={() => void reviewVerification(v.id, 'APPROVE')} />
            <PrimaryButton label="Reject" outline onPress={() => void reviewVerification(v.id, 'REJECT')} />
          </Card>
        ))}
        {!verifications.length && (
          <Card>
            <Text style={styles.muted}>No pending Verified applications.</Text>
          </Card>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Merchant registration</Text>
        {merchants.map((m) => (
          <Card key={m.id}>
            <Text style={styles.cardTitle}>{m.businessName}</Text>
            <Text style={styles.muted}>
              {m.category || 'Business'} · {m.owner?.email || '—'}
            </Text>
            <Text style={[styles.muted, { fontSize: 12 }]}>/{m.slug}</Text>
            <PrimaryButton label="Approve" arrow onPress={() => decide(m.id, 'ACTIVE')} />
            <PrimaryButton label="Suspend" outline onPress={() => decide(m.id, 'SUSPENDED')} />
          </Card>
        ))}
        {!merchants.length && (
          <Card>
            <Text style={styles.muted}>All clear — no pending merchant approvals.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AdminUsersScreen({
  session,
  embedded,
  onBack,
}: {
  session: Session;
  embedded?: boolean;
  onBack?: () => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setUsers(await api<UserRow[]>('/admin/users', { token: session.token }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setUsers([]);
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(id: string, role: UserRow['role']) {
    try {
      setMsg('');
      await api(`/admin/users/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ role }),
      });
      setMsg('Role updated');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  const filtered = users.filter((u) => {
    if (!q.trim()) return true;
    const hay = `${u.name} ${u.email} ${u.role}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const counts = {
    CUSTOMER: users.filter((u) => u.role === 'CUSTOMER').length,
    MERCHANT_OWNER: users.filter((u) => u.role === 'MERCHANT_OWNER').length,
    STAFF: users.filter((u) => u.role === 'STAFF').length,
    SUPER_ADMIN: users.filter((u) => u.role === 'SUPER_ADMIN').length,
  };

  return (
    <SafeAreaView style={styles.screen} edges={embedded ? [] : ['top']}>
      <KeyboardAwareScroll
        contentContainerStyle={styles.pad}
        bottomExtra={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.coral}
          />
        }
      >
        {!!onBack && (
          <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.coral} />
            <Text style={{ color: colors.coral, fontWeight: '700' }}>Back</Text>
          </Pressable>
        )}
        <ScreenHeader title="Users" subtitle={`${users.length} accounts on the platform`} />
        <View style={styles.grid}>
          <StatCard icon="people-outline" label="Customers" value={counts.CUSTOMER} />
          <StatCard icon="storefront-outline" label="Owners" value={counts.MERCHANT_OWNER} />
          <StatCard icon="person-outline" label="Staff" value={counts.STAFF} />
          <StatCard icon="shield-outline" label="Admins" value={counts.SUPER_ADMIN} />
        </View>
        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          value={q}
          onChangeText={setQ}
          placeholder="Search name, email, role…"
          autoCapitalize="none"
        />
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {filtered.map((u) => (
          <Card key={u.id}>
            <View style={styles.row}>
              {u.photoUrl ? (
                <LogoImage uri={u.photoUrl} size={36} borderRadius={18} />
              ) : (
                <View style={styles.iconTile}>
                  <Text style={{ fontWeight: '900', color: colors.coral }}>{u.name.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{u.name}</Text>
                <Text style={styles.muted}>{u.email}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.badge}>{u.role}</Text>
                  <Text style={[styles.muted, { fontSize: 12, marginBottom: 0, alignSelf: 'center' }]}>
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {(['CUSTOMER', 'MERCHANT_OWNER', 'STAFF', 'SUPER_ADMIN'] as const).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => void setRole(u.id, role)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: u.role === role ? colors.coral : colors.pink,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: u.role === role ? '#fff' : colors.coral }}>
                    {role.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
        {!filtered.length && !error && (
          <Card>
            <Text style={styles.muted}>No users match.</Text>
          </Card>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

export function AdminBillingScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack?: () => void;
}) {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setRows(await api<SubRow[]>('/admin/subscriptions', { token: session.token }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setRows([]);
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: { plan?: string; status?: string }) {
    try {
      setMsg('');
      await api(`/admin/subscriptions/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify(body),
      });
      setMsg('Subscription updated');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  const paying = rows.filter((r) => r.plan !== 'FREE' && r.status === 'ACTIVE').length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.coral}
          />
        }
      >
        {!!onBack && (
          <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.coral} />
            <Text style={{ color: colors.coral, fontWeight: '700' }}>Back</Text>
          </Pressable>
        )}
        <ScreenHeader
          title="Plans & Billing"
          subtitle={`${rows.length} subscriptions · ${paying} paying`}
        />
        <View style={styles.grid}>
          <StatCard icon="card-outline" label="Subscriptions" value={rows.length} />
          <StatCard icon="cash-outline" label="Paying" value={paying} />
        </View>
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {rows.map((s) => (
          <Card key={s.id}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={[styles.row, { flex: 1, gap: 10 }]}>
                {s.merchant?.logoUrl ? (
                  <LogoImage uri={s.merchant.logoUrl} size={36} borderRadius={10} />
                ) : (
                  <View style={styles.iconTile}>
                    <Text style={{ fontWeight: '900', color: colors.coral }}>
                      {(s.merchant?.businessName || '?').slice(0, 1)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {s.merchant?.businessName || 'Unknown business'}
                  </Text>
                  <Text style={styles.muted}>/{s.merchant?.slug || '—'}</Text>
                </View>
              </View>
              <Text style={styles.badge}>{s.plan}</Text>
            </View>
            <Text style={[styles.muted, { marginBottom: 8 }]}>
              {s.status} · {s.provider || 'none'} · updated{' '}
              {new Date(s.updatedAt).toLocaleDateString()}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['FREE', 'MONTHLY', 'YEARLY'] as const).map((plan) => (
                <Pressable
                  key={plan}
                  onPress={() => void patch(s.id, { plan })}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: s.plan === plan ? colors.coral : colors.pink,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: s.plan === plan ? '#fff' : colors.coral }}>
                    {plan}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => void patch(s.id, { status: 'ACTIVE' })}
                style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ECFDF5' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.success }}>Activate</Text>
              </Pressable>
              <Pressable
                onPress={() => void patch(s.id, { status: 'CANCELED' })}
                style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEF2F2' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>Cancel</Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {!rows.length && !error && (
          <Card>
            <Text style={styles.muted}>No subscriptions yet.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
