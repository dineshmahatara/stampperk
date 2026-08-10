import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { api } from '../api';
import { colors, radii } from '../theme';
import type { Session } from './LoginScreen';

export type NotifPrefs = {
  pushConsent?: boolean;
  notifyOffers?: boolean;
  notifyLoyalty?: boolean;
  notifyExpiry?: boolean;
  notifyTransfers?: boolean;
  notifyStaff?: boolean;
};

type CategoryKey =
  | 'notifyOffers'
  | 'notifyLoyalty'
  | 'notifyExpiry'
  | 'notifyTransfers'
  | 'notifyStaff';

const CATEGORIES: Array<{
  key: CategoryKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tint: string;
}> = [
  {
    key: 'notifyOffers',
    icon: 'pricetag',
    title: 'Offers & promotions',
    subtitle: 'Campaigns, deals, and merchant messages.',
    tint: '#FF6B6B',
  },
  {
    key: 'notifyLoyalty',
    icon: 'disc',
    title: 'Loyalty activity',
    subtitle: 'Stamps, completed cards, and redeemed rewards.',
    tint: '#FF5A5F',
  },
  {
    key: 'notifyExpiry',
    icon: 'timer-outline',
    title: 'Expiry reminders',
    subtitle: 'Heads-up before cards or rewards expire.',
    tint: '#F59E0B',
  },
  {
    key: 'notifyTransfers',
    icon: 'swap-horizontal',
    title: 'Stamp transfers',
    subtitle: 'Incoming gifts and transfer status updates.',
    tint: '#EC4899',
  },
  {
    key: 'notifyStaff',
    icon: 'people',
    title: 'Account & access',
    subtitle: 'Invites, access changes, and system notices.',
    tint: '#8B5CF6',
  },
];

function PrefSwitch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: '#E8E4E1', true: '#FFB4B7' }}
      thumbColor={value ? colors.coral : '#FFFFFF'}
      ios_backgroundColor="#E8E4E1"
    />
  );
}

export function CustomerNotificationSettingsScreen({
  session,
  initial,
  onBack,
  onSaved,
}: {
  session: Session;
  initial?: NotifPrefs | null;
  onBack: () => void;
  onSaved?: (prefs: NotifPrefs) => void;
}) {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    pushConsent: initial?.pushConsent !== false,
    notifyOffers: initial?.notifyOffers !== false,
    notifyLoyalty: initial?.notifyLoyalty !== false,
    notifyExpiry: initial?.notifyExpiry !== false,
    notifyTransfers: initial?.notifyTransfers !== false,
    notifyStaff: initial?.notifyStaff !== false,
  });
  const [deviceStatus, setDeviceStatus] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const refreshDevice = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') setDeviceStatus('granted');
      else if (status === 'denied') setDeviceStatus('denied');
      else setDeviceStatus('undetermined');
    } catch {
      setDeviceStatus('undetermined');
    }
  }, []);

  useEffect(() => {
    void refreshDevice();
  }, [refreshDevice]);

  async function patch(partial: NotifPrefs) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    setSaving(true);
    setMsg('');
    try {
      const updated = await api<NotifPrefs>('/users/me', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify(partial),
      });
      const merged = {
        pushConsent: updated.pushConsent !== false,
        notifyOffers: updated.notifyOffers !== false,
        notifyLoyalty: updated.notifyLoyalty !== false,
        notifyExpiry: updated.notifyExpiry !== false,
        notifyTransfers: updated.notifyTransfers !== false,
        notifyStaff: updated.notifyStaff !== false,
      };
      setPrefs(merged);
      onSaved?.(merged);
    } catch (e) {
      setPrefs(prefs);
      setMsg(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function requestDevicePermission() {
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.status === 'granted') {
        await Linking.openSettings();
        return;
      }
      const next = await Notifications.requestPermissionsAsync();
      await refreshDevice();
      if (next.status !== 'granted') {
        await Linking.openSettings();
      }
    } catch {
      await Linking.openSettings();
    }
  }

  const masterOn = prefs.pushConsent !== false;
  const deviceOk = deviceStatus === 'granted';

  return (
    <SafeAreaView style={ns.screen} edges={['top']}>
      <View style={ns.topBar}>
        <Pressable onPress={onBack} hitSlop={12} style={ns.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        {saving ? <ActivityIndicator color={colors.coral} /> : <View style={{ width: 22 }} />}
      </View>

      <ScrollView contentContainerStyle={ns.pad} showsVerticalScrollIndicator={false}>
        <Text style={ns.title}>Notification settings</Text>
        <Text style={ns.subtitle}>Choose which alerts reach this device.</Text>

        {/* Device permission */}
        <View style={[ns.card, ns.deviceCard]}>
          <View style={ns.row}>
            <View style={[ns.iconBubble, { backgroundColor: deviceOk ? '#DCFCE7' : '#FFE4E6' }]}>
              <Ionicons
                name={deviceOk ? 'notifications' : 'notifications-off'}
                size={20}
                color={deviceOk ? '#16A34A' : colors.coral}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ns.cardTitle}>
                {deviceOk ? 'Device notifications are on' : 'Device notifications need attention'}
              </Text>
              <Text style={ns.cardSub}>
                {deviceOk
                  ? Platform.OS === 'android'
                    ? 'Sounds and channels can also be tuned in system settings.'
                    : 'You can refine banners and sounds in iOS Settings.'
                  : 'Stampz needs permission before category alerts can appear on this phone.'}
              </Text>
            </View>
          </View>
          <Pressable style={ns.softBtn} onPress={() => void requestDevicePermission()}>
            <Ionicons name="settings-outline" size={16} color={colors.coral} />
            <Text style={ns.softBtnText}>
              {deviceOk ? 'Open device settings' : 'Allow notifications'}
            </Text>
          </Pressable>
        </View>

        {/* Master push */}
        <View style={ns.card}>
          <View style={ns.row}>
            <View style={[ns.iconBubble, { backgroundColor: '#FFE4E6' }]}>
              <Ionicons name="megaphone" size={20} color={colors.coral} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={ns.cardTitle}>Push alerts</Text>
              <Text style={ns.cardSub}>
                Master switch for this inbox. Off means categories stay silent on-device.
              </Text>
            </View>
            <PrefSwitch
              value={masterOn}
              onChange={(v) => void patch({ pushConsent: v })}
            />
          </View>
        </View>

        <Text style={ns.sectionTitle}>Alert categories</Text>
        <Text style={ns.sectionSub}>
          These control push only. Matching updates still appear in your Stampz inbox.
        </Text>

        <View style={[ns.card, { paddingVertical: 4, opacity: masterOn ? 1 : 0.55 }]}>
          {CATEGORIES.map((c, i) => {
            const on = prefs[c.key] !== false;
            return (
              <View key={c.key}>
                {i > 0 && <View style={ns.divider} />}
                <View style={ns.catRow}>
                  <View style={[ns.iconBubbleSm, { backgroundColor: `${c.tint}18` }]}>
                    <Ionicons name={c.icon} size={16} color={c.tint} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={ns.catTitle}>{c.title}</Text>
                    <Text style={ns.catSub}>{c.subtitle}</Text>
                  </View>
                  <PrefSwitch
                    value={on && masterOn}
                    disabled={!masterOn}
                    onChange={(v) => void patch({ [c.key]: v })}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={[ns.card, ns.noteCard]}>
          <View style={[ns.iconBubbleSm, { backgroundColor: '#FFE4E6' }]}>
            <Ionicons name="shield-checkmark" size={16} color={colors.coral} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ns.cardTitle}>Essential inbox updates</Text>
            <Text style={ns.cardSub}>
              Critical account messages always stay in your inbox. The Push alerts switch still
              decides whether they also appear on this device.
            </Text>
          </View>
        </View>

        {!!msg && <Text style={ns.error}>{msg}</Text>}
        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ns = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF6F5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.06)',
  },
  pad: { paddingHorizontal: 20, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.05)',
    shadowColor: '#FF5A5F',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  deviceCard: {
    borderColor: 'rgba(255,90,95,0.12)',
  },
  noteCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FFF9F8',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleSm: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  cardSub: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
  softBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F1',
    borderRadius: radii.pill,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  softBtnText: { fontWeight: '800', color: colors.coral, fontSize: 13.5 },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionSub: {
    marginBottom: 10,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  catTitle: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  catSub: { marginTop: 2, fontSize: 12, lineHeight: 16, color: colors.muted },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(28,28,30,0.08)',
    marginLeft: 48,
  },
  error: {
    marginTop: 8,
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
});
