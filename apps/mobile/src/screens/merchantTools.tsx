import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, styles } from '../theme';
import { Card, PrimaryButton, ScreenHeader, StatCard } from '../ui';
import { BusinessSwitcher } from '../components/BusinessSwitcher';

type Session = { token: string; user: { role: string; name?: string } };

type ToolItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  ownerOnly?: boolean;
};

const TOOLS: ToolItem[] = [
  { key: 'Campaigns', title: 'Campaigns & Push', subtitle: 'Offers and notifications', icon: 'megaphone-outline' },
  { key: 'Customers', title: 'Customers', subtitle: 'CRM segments & last visit', icon: 'people-outline' },
  { key: 'Stamps', title: 'Stamp log', subtitle: 'All stamps issued', icon: 'ribbon-outline' },
  { key: 'Redemptions', title: 'Redemptions', subtitle: 'Rewards claimed', icon: 'gift-outline' },
  { key: 'Coupons', title: 'Coupons', subtitle: 'Create & redeem codes', icon: 'pricetag-outline', ownerOnly: true },
  { key: 'Automations', title: 'Automations', subtitle: 'Win-back, birthday, near-reward', icon: 'flash-outline', ownerOnly: true },
  { key: 'Analytics', title: 'Analytics', subtitle: 'Retention & performance', icon: 'stats-chart-outline', ownerOnly: true },
  { key: 'Staff', title: 'Staff', subtitle: 'Invite and manage team', icon: 'id-card-outline', ownerOnly: true },
  { key: 'Branches', title: 'Branches', subtitle: 'Store locations', icon: 'business-outline', ownerOnly: true },
  { key: 'Reports', title: 'Reports', subtitle: 'CSV export summaries', icon: 'download-outline', ownerOnly: true },
];

function Shell({
  title,
  subtitle,
  children,
  onBack,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.coral} />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      >
        {!!onBack && (
          <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.coral} />
            <Text style={{ color: colors.coral, fontWeight: '700' }}>Back</Text>
          </Pressable>
        )}
        <ScreenHeader title={title} subtitle={subtitle} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function MerchantMoreHub({
  navigation,
  isOwner,
  token,
  onBusinessSwitch,
}: {
  navigation: { navigate: (name: string) => void };
  isOwner: boolean;
  token: string;
  onBusinessSwitch?: () => void;
}) {
  const items = TOOLS.filter((t) => (t.ownerOnly ? isOwner : true));
  return (
    <Shell title="More tools" subtitle="Merchant features from the web dashboard">
      <BusinessSwitcher
        token={token}
        onSwitched={onBusinessSwitch}
        allowCreate={isOwner}
      />
      {items.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => navigation.navigate(t.key)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: colors.pink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={t.icon} size={20} color={colors.coral} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.ink }}>{t.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{t.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </Shell>
  );
}

function CustomersScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState('ALL');

  const load = useCallback(() => {
    setLoading(true);
    api<any[]>('/merchants/me/customers', { token: session.token })
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [session.token]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (seg !== 'ALL' && r.segment !== seg) return false;
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.name || ''} ${r.email || ''} ${r.phone || ''}`.toLowerCase().includes(s);
    });
  }, [rows, q, seg]);

  return (
    <Shell title="Customers" subtitle={`${filtered.length} shown`} onBack={onBack} refreshing={loading} onRefresh={load}>
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholder="Search name, email, phone"
        placeholderTextColor={colors.muted}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {['ALL', 'NEW', 'RETURNING', 'VIP', 'AT_RISK'].map((s) => (
          <Pressable
            key={s}
            onPress={() => setSeg(s)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: seg === s ? colors.coral : colors.pink,
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 12, color: seg === s ? '#fff' : colors.coral }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      {filtered.map((c) => (
        <Card key={c.id || c.userId}>
          <Text style={styles.cardTitle}>{c.name || 'Customer'}</Text>
          <Text style={styles.muted}>{c.email || c.phone || '—'}</Text>
          <Text style={{ color: colors.coral, fontWeight: '700', marginTop: 6 }}>
            {c.segment || 'NEW'} · visits {c.visitCount ?? c.stamps ?? 0}
            {c.lastVisitAt ? ` · last ${new Date(c.lastVisitAt).toLocaleDateString()}` : ''}
          </Text>
        </Card>
      ))}
      {!filtered.length && !loading && (
        <Card>
          <Text style={styles.muted}>No customers match.</Text>
        </Card>
      )}
    </Shell>
  );
}

function SimpleListScreen({
  title,
  subtitle,
  path,
  session,
  onBack,
  renderItem,
}: {
  title: string;
  subtitle: string;
  path: string;
  session: Session;
  onBack: () => void;
  renderItem: (row: any) => ReactNode;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api<any>(path, { token: session.token })
      .then((d) => setRows(Array.isArray(d) ? d : d?.items || d?.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [path, session.token]);
  useEffect(load, [load]);
  return (
    <Shell title={title} subtitle={subtitle} onBack={onBack} refreshing={loading} onRefresh={load}>
      {rows.map((r, i) => (
        <View key={r.id || String(i)}>{renderItem(r)}</View>
      ))}
      {!rows.length && !loading && (
        <Card>
          <Text style={styles.muted}>Nothing here yet.</Text>
        </Card>
      )}
    </Shell>
  );
}

function CouponsScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api<any[]>('/merchants/me/coupons', { token: session.token })
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [session.token]);
  useEffect(load, [load]);

  async function create() {
    if (!code.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      await api('/merchants/me/coupons', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          title: `${code.trim().toUpperCase()} offer`,
          type: 'PERCENT',
          value: 10,
          segment: 'ALL',
        }),
      });
      setCode('');
      setMsg('Coupon created');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Coupons" subtitle="Discount codes for customers" onBack={onBack} onRefresh={load}>
      {!!msg && <Text style={styles.badge}>{msg}</Text>}
      <Card>
        <Text style={styles.cardTitle}>New coupon</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="CODE10"
          placeholderTextColor={colors.muted}
        />
        <PrimaryButton label={busy ? 'Saving…' : 'Create 10% coupon'} arrow onPress={() => void create()} disabled={busy} />
      </Card>
      {rows.map((c) => (
        <Card key={c.id}>
          <Text style={styles.cardTitle}>{c.code}</Text>
          <Text style={styles.muted}>
            {c.type} · {c.value} · {c.segment || 'ALL'} · {c.active === false ? 'Off' : 'Active'}
          </Text>
        </Card>
      ))}
    </Shell>
  );
}

function AutomationsScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    api<any[]>('/merchants/me/automations', { token: session.token })
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [session.token]);
  useEffect(load, [load]);

  async function toggle(id: string, active: boolean) {
    try {
      await api(`/merchants/me/automations/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ active }),
      });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function runNow() {
    setMsg('Running…');
    try {
      const res = await api<{ fired?: number; ok?: boolean }>('/merchants/me/automations/run', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({}),
      });
      setMsg(`Fired ${res.fired ?? 0} automation(s)`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Run failed');
    }
  }

  return (
    <Shell title="Automations" subtitle="Push rules for loyalty" onBack={onBack} onRefresh={load}>
      {!!msg && <Text style={styles.badge}>{msg}</Text>}
      <PrimaryButton label="Run automations now" arrow onPress={() => void runNow()} />
      {rows.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle}>{r.name || r.type || 'Rule'}</Text>
              <Text style={styles.muted}>{r.type}</Text>
            </View>
            <Switch
              value={r.active !== false && r.enabled !== false}
              onValueChange={(v) => void toggle(r.id, v)}
              trackColor={{ true: colors.coral }}
            />
          </View>
        </Card>
      ))}
      {!rows.length && (
        <Card>
          <Text style={styles.muted}>No automation rules yet (seeded on first use).</Text>
        </Card>
      )}
    </Shell>
  );
}

function AnalyticsScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api<any>('/merchants/me/analytics', { token: session.token })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [session.token]);
  useEffect(load, [load]);

  const stamps = data?.stamps && typeof data.stamps === 'object' ? data.stamps : null;
  const segments = data?.newVsReturning && typeof data.newVsReturning === 'object' ? data.newVsReturning : null;
  const series = Array.isArray(data?.stampSeries) ? data.stampSeries : [];

  return (
    <Shell title="Analytics" subtitle="Business performance" onBack={onBack} refreshing={loading} onRefresh={load}>
      {!data && !loading && (
        <Card>
          <Text style={styles.muted}>Could not load analytics.</Text>
        </Card>
      )}
      {!!data && (
        <>
          <View style={styles.grid}>
            <StatCard icon="ribbon" label="Stamps (7d)" value={stamps?.daily7 ?? 0} />
            <StatCard icon="calendar" label="Stamps (30d)" value={stamps?.weekly30 ?? 0} />
          </View>
          <View style={styles.grid}>
            <StatCard icon="time" label="Stamps (90d)" value={stamps?.monthly90 ?? 0} />
            <StatCard icon="people" label="Active members" value={data.activeMembers ?? 0} />
          </View>
          <View style={styles.grid}>
            <StatCard icon="gift" label="Redeem rate %" value={data.redemptionRate ?? 0} />
            <StatCard icon="trending-up" label="Retention %" value={data.retentionProxy ?? 0} />
          </View>
          {!!segments && (
            <Card>
              <Text style={styles.cardTitle}>Customer segments</Text>
              <Text style={styles.muted}>
                New {segments.new ?? 0} · Returning {segments.returning ?? 0} · At risk {segments.atRisk ?? 0}
              </Text>
            </Card>
          )}
          <Card>
            <Text style={styles.cardTitle}>Last 30 days</Text>
            <Text style={styles.muted}>
              Coupons redeemed: {data.couponRedemptions30 ?? 0}
              {'\n'}
              Loyalty spend: {data.loyaltyAttributedSpend30 ?? 0}
            </Text>
          </Card>
          {Array.isArray(data.topRewards) && data.topRewards.length > 0 && (
            <Card>
              <Text style={styles.cardTitle}>Top rewards</Text>
              {data.topRewards.slice(0, 5).map((r: any, i: number) => (
                <Text key={i} style={styles.muted}>
                  {r.title || 'Reward'} · {r.count ?? 0}
                </Text>
              ))}
            </Card>
          )}
          {Array.isArray(data.staffPerformance) && data.staffPerformance.length > 0 && (
            <Card>
              <Text style={styles.cardTitle}>Staff stamps</Text>
              {data.staffPerformance.slice(0, 5).map((s: any) => (
                <Text key={s.id || s.name} style={styles.muted}>
                  {s.name} · {s.stamps ?? 0}
                </Text>
              ))}
            </Card>
          )}
          {series.slice(-8).map((p: any, i: number) => (
            <Card key={p.label || String(i)}>
              <Text style={styles.cardTitle}>{p.label}</Text>
              <Text style={styles.muted}>Stamps {p.count ?? 0}</Text>
            </Card>
          ))}
        </>
      )}
    </Shell>
  );
}

function StaffScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [merchant, setMerchant] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    api<any>('/merchants/me', { token: session.token })
      .then(setMerchant)
      .catch(() => setMerchant(null));
  }, [session.token]);
  useEffect(load, [load]);

  const staff: any[] = merchant?.staff || [];

  async function invite() {
    if (!email.trim() || name.trim().length < 2) {
      setMsg('Name (2+ chars) and email required');
      return;
    }
    setMsg('');
    try {
      await api('/merchants/me/staff', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          permissions: ['SCAN', 'REDEEM'],
        }),
      });
      setEmail('');
      setName('');
      setMsg('Staff invited');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Invite failed');
    }
  }

  async function setActive(id: string, active: boolean) {
    try {
      await api(`/merchants/me/staff/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ active }),
      });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    }
  }

  return (
    <Shell title="Staff" subtitle="Team access" onBack={onBack} onRefresh={load}>
      {!!msg && <Text style={styles.badge}>{msg}</Text>}
      <Card>
        <Text style={styles.cardTitle}>Invite staff</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="staff@email.com"
          placeholderTextColor={colors.muted}
        />
        <PrimaryButton label="Invite" arrow onPress={() => void invite()} />
      </Card>
      {staff.map((s) => (
        <Card key={s.id}>
          <Text style={styles.cardTitle}>{s.user?.name || s.user?.email || 'Staff'}</Text>
          <Text style={styles.muted}>{s.user?.email}</Text>
          <Text style={{ marginTop: 6, fontWeight: '700', color: s.active ? colors.success : colors.muted }}>
            {s.active ? 'Active' : 'Inactive'}
          </Text>
          <PrimaryButton
            label={s.active ? 'Deactivate' : 'Activate'}
            outline
            onPress={() => void setActive(s.id, !s.active)}
          />
        </Card>
      ))}
    </Shell>
  );
}

function BranchesScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [merchant, setMerchant] = useState<any>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    api<any>('/merchants/me', { token: session.token })
      .then(setMerchant)
      .catch(() => setMerchant(null));
  }, [session.token]);
  useEffect(load, [load]);
  const branches: any[] = merchant?.branches || [];

  async function add() {
    if (!name.trim()) return;
    try {
      await api('/merchants/me/branches', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      setMsg('Branch added');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <Shell title="Branches" subtitle="Locations" onBack={onBack} onRefresh={load}>
      {!!msg && <Text style={styles.badge}>{msg}</Text>}
      <Card>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Branch name"
          placeholderTextColor={colors.muted}
        />
        <PrimaryButton label="Add branch" arrow onPress={() => void add()} />
      </Card>
      {branches.map((b) => (
        <Card key={b.id}>
          <Text style={styles.cardTitle}>{b.name}</Text>
          <Text style={styles.muted}>{b.address || b.city || '—'}</Text>
        </Card>
      ))}
    </Shell>
  );
}

function ReportsScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  async function run(kind: 'customers' | 'stamps' | 'redemptions' | 'campaigns') {
    setBusy(kind);
    setMsg('');
    try {
      const res = await api<any>(`/merchants/me/reports/${kind}`, { token: session.token });
      const count = Array.isArray(res) ? res.length : res?.rows?.length ?? res?.count ?? 'OK';
      setMsg(`${kind} report ready (${count})`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <Shell title="Reports" subtitle="Generate CSV-ready exports" onBack={onBack}>
      {!!msg && <Text style={styles.badge}>{msg}</Text>}
      {(['customers', 'stamps', 'redemptions', 'campaigns'] as const).map((k) => (
        <PrimaryButton
          key={k}
          label={busy === k ? 'Loading…' : `Export ${k}`}
          outline={busy !== k}
          arrow
          onPress={() => void run(k)}
          disabled={!!busy}
        />
      ))}
      <Card>
        <Text style={styles.muted}>
          Mobile shows a success summary. Full CSV download is available on the web Reports page.
        </Text>
      </Card>
    </Shell>
  );
}

const Stack = createNativeStackNavigator();

export function MerchantMoreStack({
  session,
  merchantKey,
  isOwner,
  onBusinessSwitch,
  CampaignsScreen,
}: {
  session: Session;
  merchantKey: number;
  isOwner: boolean;
  onBusinessSwitch?: () => void;
  CampaignsScreen: ComponentType<any>;
}) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Hub">
        {({ navigation }) => (
          <MerchantMoreHub
            navigation={navigation}
            isOwner={isOwner}
            token={session.token}
            onBusinessSwitch={onBusinessSwitch}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Campaigns">
        {({ navigation }) => (
          <SafeAreaView style={styles.screen} edges={['top']}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.coral} />
              <Text style={{ color: colors.coral, fontWeight: '700' }}>More</Text>
            </Pressable>
            <CampaignsScreen session={session} merchantKey={merchantKey} />
          </SafeAreaView>
        )}
      </Stack.Screen>
      <Stack.Screen name="Customers">
        {({ navigation }) => <CustomersScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Stamps">
        {({ navigation }) => (
          <SimpleListScreen
            title="Stamp log"
            subtitle="Recent stamps"
            path="/merchants/me/stamps"
            session={session}
            onBack={() => navigation.goBack()}
            renderItem={(r) => (
              <Card>
                <Text style={styles.cardTitle}>{r.customer?.name || r.user?.name || 'Customer'}</Text>
                <Text style={styles.muted}>
                  {r.program?.title || 'Program'} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                </Text>
              </Card>
            )}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Redemptions">
        {({ navigation }) => (
          <SimpleListScreen
            title="Redemptions"
            subtitle="Claimed rewards"
            path="/merchants/me/redemptions"
            session={session}
            onBack={() => navigation.goBack()}
            renderItem={(r) => (
              <Card>
                <Text style={styles.cardTitle}>{r.rewardTitle || r.reward?.title || 'Reward'}</Text>
                <Text style={styles.muted}>
                  {r.customer?.name || r.user?.name || 'Customer'} ·{' '}
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                </Text>
              </Card>
            )}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Coupons">
        {({ navigation }) => <CouponsScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Automations">
        {({ navigation }) => <AutomationsScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Analytics">
        {({ navigation }) => <AnalyticsScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Staff">
        {({ navigation }) => <StaffScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Branches">
        {({ navigation }) => <BranchesScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Reports">
        {({ navigation }) => <ReportsScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
