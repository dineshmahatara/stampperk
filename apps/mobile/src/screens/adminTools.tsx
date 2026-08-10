import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
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
import { AdminBillingScreen, AdminUsersScreen } from './admin';

type Session = { token: string; user: { name: string; email: string; role: string } };

type Tool = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TOOLS: Tool[] = [
  { key: 'Billing', title: 'Plans & Billing', subtitle: 'Change merchant plans', icon: 'card-outline' },
  { key: 'Users', title: 'Users', subtitle: 'Roles across the platform', icon: 'people-outline' },
  { key: 'Customers', title: 'Customers', subtitle: 'Loyalty members directory', icon: 'happy-outline' },
  { key: 'Staff', title: 'Staff', subtitle: 'Staff across merchants', icon: 'id-card-outline' },
  { key: 'Activity', title: 'Activity', subtitle: 'Audit trail', icon: 'pulse-outline' },
  { key: 'Support', title: 'Support', subtitle: 'Tickets from users', icon: 'chatbubbles-outline' },
  { key: 'Analytics', title: 'Analytics', subtitle: 'Platform trends', icon: 'stats-chart-outline' },
  { key: 'Pricing', title: 'Pricing CMS', subtitle: 'Region prices & plan limits', icon: 'pricetags-outline' },
];

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <Ionicons name="arrow-back" size={20} color={colors.coral} />
      <Text style={{ color: colors.coral, fontWeight: '700' }}>More</Text>
    </Pressable>
  );
}

function Hub({ navigation }: { navigation: { navigate: (n: string) => void } }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title="Admin tools" subtitle="Platform features from the web admin" />
        {TOOLS.map((t) => (
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
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomersScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      setRows(await api<any[]>('/admin/customers', { token: session.token }));
    } catch {
      setRows([]);
    }
  }, [session.token]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    return `${r.name || ''} ${r.email || ''} ${r.phone || ''}`.toLowerCase().includes(q.trim().toLowerCase());
  });
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
        <Back onPress={onBack} />
        <ScreenHeader title="Customers" subtitle={`${filtered.length} loyalty members`} />
        <TextInput style={styles.input} value={q} onChangeText={setQ} placeholder="Search…" autoCapitalize="none" />
        {filtered.map((c) => (
          <Card key={c.id}>
            <Text style={styles.cardTitle}>{c.name || 'Customer'}</Text>
            <Text style={styles.muted}>{c.email || c.phone || '—'}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function StaffScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => {
    try {
      setRows(await api<any[]>('/admin/staff', { token: session.token }));
    } catch {
      setRows([]);
    }
  }, [session.token]);
  useEffect(() => {
    void load();
  }, [load]);

  async function setActive(id: string, active: boolean) {
    await api(`/admin/staff/${id}`, {
      method: 'PATCH',
      token: session.token,
      body: JSON.stringify({ active }),
    });
    await load();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Back onPress={onBack} />
        <ScreenHeader title="Staff" subtitle="Across all merchants" />
        {rows.map((s) => (
          <Card key={s.id}>
            <Text style={styles.cardTitle}>{s.user?.name || s.user?.email || 'Staff'}</Text>
            <Text style={styles.muted}>
              {s.merchant?.businessName || '—'} · {s.active ? 'Active' : 'Inactive'}
            </Text>
            <PrimaryButton
              label={s.active ? 'Deactivate' : 'Activate'}
              outline
              onPress={() => void setActive(s.id, !s.active)}
            />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => {
    try {
      const res = await api<any>('/admin/activity', { token: session.token });
      setRows(Array.isArray(res) ? res : res?.items || res?.activity || []);
    } catch {
      setRows([]);
    }
  }, [session.token]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Back onPress={onBack} />
        <ScreenHeader title="Activity" subtitle="Recent platform events" />
        {rows.slice(0, 80).map((a, i) => (
          <Card key={a.id || String(i)}>
            <Text style={styles.cardTitle}>{a.title || a.action || a.type || 'Event'}</Text>
            <Text style={styles.muted}>{a.detail || a.body || a.entityType || ''}</Text>
            <Text style={[styles.muted, { fontSize: 11 }]}>
              {a.at || a.createdAt ? new Date(a.at || a.createdAt).toLocaleString() : ''}
            </Text>
          </Card>
        ))}
        {!rows.length && (
          <Card>
            <Text style={styles.muted}>No activity yet.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    try {
      setRows(await api<any[]>('/admin/support-tickets', { token: session.token }));
    } catch {
      setRows([]);
    }
  }, [session.token]);
  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string) {
    try {
      await api(`/admin/support-tickets/${id}`, {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      setMsg('Ticket resolved');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Back onPress={onBack} />
        <ScreenHeader title="Support" subtitle="Incoming tickets" />
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        {rows.map((t) => (
          <Card key={t.id}>
            <Text style={styles.cardTitle}>{t.subject || t.title || 'Ticket'}</Text>
            <Text style={styles.muted}>{t.body || t.message || ''}</Text>
            <Text style={{ marginTop: 6, fontWeight: '700', color: colors.coral }}>{t.status || 'OPEN'}</Text>
            {t.status !== 'RESOLVED' && (
              <PrimaryButton label="Mark resolved" arrow onPress={() => void resolve(t.id)} />
            )}
          </Card>
        ))}
        {!rows.length && (
          <Card>
            <Text style={styles.muted}>No support tickets.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalyticsScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api<any>('/admin/analytics', { token: session.token })
      .then(setData)
      .catch(() => setData(null));
  }, [session.token]);
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Back onPress={onBack} />
        <ScreenHeader title="Analytics" subtitle="Platform trends" />
        {!data && (
          <Card>
            <Text style={styles.muted}>Could not load analytics.</Text>
          </Card>
        )}
        {!!data && (
          <>
            <View style={styles.grid}>
              <StatCard icon="storefront" label="Merchants" value={data.activeMerchants ?? data.merchants ?? '—'} />
              <StatCard icon="people" label="Customers" value={data.customers ?? '—'} />
            </View>
            <View style={styles.grid}>
              <StatCard icon="ribbon" label="Stamps" value={data.stamps ?? '—'} />
              <StatCard icon="gift" label="Redeems" value={data.redemptions ?? '—'} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PricingScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [catalog, setCatalog] = useState<any>(null);
  const [regionCode, setRegionCode] = useState('US');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCatalog(await api<any>('/admin/pricing', { token: session.token }));
    } catch {
      setCatalog(null);
    }
  }, [session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const region = (catalog?.regions || []).find((r: any) => r.regionCode === regionCode) || catalog?.regions?.[0];

  function patchRegion(patch: Record<string, number>) {
    if (!catalog || !region) return;
    setCatalog({
      ...catalog,
      regions: catalog.regions.map((r: any) =>
        r.regionCode === region.regionCode ? { ...r, ...patch } : r,
      ),
    });
  }

  async function save() {
    if (!catalog) return;
    setBusy(true);
    setMsg('');
    try {
      const saved = await api<any>('/admin/pricing', {
        method: 'PUT',
        token: session.token,
        body: JSON.stringify({ regions: catalog.regions, plans: catalog.plans }),
      });
      setCatalog(saved);
      setMsg(saved.note || 'Saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Back onPress={onBack} />
        <ScreenHeader title="Pricing CMS" subtitle="List prices by region" />
        {!!msg && <Text style={styles.badge}>{msg}</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(catalog?.regions || []).map((r: any) => (
            <Pressable
              key={r.regionCode}
              onPress={() => setRegionCode(r.regionCode)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: region?.regionCode === r.regionCode ? colors.coral : colors.pink,
              }}
            >
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 12,
                  color: region?.regionCode === r.regionCode ? '#fff' : colors.coral,
                }}
              >
                {r.regionCode}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!region && (
          <Card>
            <Text style={styles.cardTitle}>
              {region.label} ({region.currency})
            </Text>
            {(
              [
                ['monthlyAmount', 'Monthly'],
                ['yearlyAmount', 'Yearly'],
                ['yearlyWasAmount', 'Yearly was'],
                ['trialDays', 'Trial days'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: '700', marginBottom: 4 }}>{label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={String(region[key])}
                  onChangeText={(v) => patchRegion({ [key]: Number(v) || 0 })}
                />
              </View>
            ))}
            <PrimaryButton label={busy ? 'Saving…' : 'Save region prices'} arrow onPress={() => void save()} disabled={busy} />
          </Card>
        )}
        {(catalog?.plans || []).map((p: any) => (
          <Card key={p.planId}>
            <Text style={styles.cardTitle}>
              {p.displayName} ({p.planId})
            </Text>
            <Text style={styles.muted}>
              Cards {p.loyaltyCards} · Staff {p.staff} · Branches {p.branches}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export function AdminMoreStack({ session }: { session: Session }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Hub">{({ navigation }) => <Hub navigation={navigation} />}</Stack.Screen>
      <Stack.Screen name="Billing">
        {({ navigation }) => <AdminBillingScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Users">
        {({ navigation }) => (
          <AdminUsersScreen session={session} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Customers">
        {({ navigation }) => <CustomersScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Staff">
        {({ navigation }) => <StaffScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Activity">
        {({ navigation }) => <ActivityScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Support">
        {({ navigation }) => <SupportScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Analytics">
        {({ navigation }) => <AnalyticsScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Pricing">
        {({ navigation }) => <PricingScreen session={session} onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
