import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { ScreenHeader } from '../ui';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import type { Session } from './LoginScreen';

type SessionRow = {
  id: string;
  deviceName?: string | null;
  deviceType?: string | null;
  ip?: string | null;
  suspicious?: boolean;
  lastSeenAt: string;
  createdAt: string;
  current?: boolean;
};

type LoginRow = {
  id: string;
  success: boolean;
  reason?: string | null;
  ip?: string | null;
  deviceName?: string | null;
  suspicious?: boolean;
  captchaUsed?: boolean;
  createdAt: string;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SecurityScreen({
  session,
  onBack,
  onLoggedOut,
}: {
  session: Session;
  onBack: () => void;
  onLoggedOut?: () => void;
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [history, setHistory] = useState<LoginRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api<SessionRow[]>('/auth/sessions', { token: session.token }),
        api<LoginRow[]>('/auth/login-history', { token: session.token }),
      ]);
      setSessions(s);
      setHistory(h);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    setBusy(true);
    try {
      await api(`/auth/sessions/${id}`, { method: 'DELETE', token: session.token });
      setMsg('Session revoked');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke');
    } finally {
      setBusy(false);
    }
  }

  function confirmLogoutAll() {
    Alert.alert(
      'Logout all devices?',
      'Other devices will be signed out. This device stays signed in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout all',
          style: 'destructive',
          onPress: () => void logoutAll(true),
        },
      ],
    );
  }

  async function logoutAll(keepCurrent: boolean) {
    setBusy(true);
    try {
      await api('/auth/logout-all', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({ keepCurrent }),
      });
      if (!keepCurrent) {
        onLoggedOut?.();
        return;
      }
      setMsg('Logged out from all other devices');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not logout all');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={s.pad} bottomExtra={40}>
        <Pressable onPress={onBack} style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.coral, fontWeight: '800' }}>← Back</Text>
        </Pressable>
        <ScreenHeader
          title="Security"
          subtitle="Devices, login history, logout all"
        />
        {!!msg && <Text style={s.ok}>{msg}</Text>}
        {!!error && <Text style={s.err}>{error}</Text>}
        {busy && <ActivityIndicator color={colors.coral} style={{ marginBottom: 12 }} />}

        <Text style={s.h}>Active devices</Text>
        <Text style={s.sub}>Manage where you are signed in. Revoke anything you don’t recognize.</Text>

        {!sessions.length && !error ? (
          <ActivityIndicator color={colors.coral} style={{ marginVertical: 16 }} />
        ) : (
          sessions.map((row) => (
            <View key={row.id} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {row.deviceName || row.deviceType || 'Device'}
                  {row.current ? ' · This device' : ''}
                </Text>
                <Text style={s.meta}>
                  {row.ip || 'IP unknown'} · Last seen {fmt(row.lastSeenAt)}
                </Text>
                {row.suspicious ? <Text style={s.warn}>Marked suspicious</Text> : null}
              </View>
              {!row.current && (
                <Pressable onPress={() => void revoke(row.id)} hitSlop={8}>
                  <Text style={s.link}>Revoke</Text>
                </Pressable>
              )}
            </View>
          ))
        )}

        <Pressable style={s.dangerBtn} onPress={confirmLogoutAll} disabled={busy}>
          <Ionicons name="log-out-outline" size={18} color="#E11D48" />
          <Text style={s.dangerText}>Logout from all other devices</Text>
        </Pressable>

        <Text style={[s.h, { marginTop: 28 }]}>Login history</Text>
        <Text style={s.sub}>Recent sign-in attempts on your account.</Text>
        {history.slice(0, 20).map((row) => (
          <View key={row.id} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>
                {row.success ? 'Success' : 'Failed'}
                {row.suspicious ? ' · Suspicious' : ''}
                {row.captchaUsed ? ' · CAPTCHA' : ''}
              </Text>
              <Text style={s.meta}>
                {fmt(row.createdAt)}
                {row.deviceName ? ` · ${row.deviceName}` : ''}
                {row.ip ? ` · ${row.ip}` : ''}
              </Text>
              {!!row.reason && <Text style={s.meta}>{row.reason}</Text>}
            </View>
            <Ionicons
              name={row.success ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={row.success ? '#10B981' : '#EF4444'}
            />
          </View>
        ))}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  pad: { paddingHorizontal: 20, paddingBottom: 32 },
  h: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 14, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.ink },
  meta: { marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 16 },
  warn: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#D97706' },
  link: { color: colors.coral, fontWeight: '800', fontSize: 13 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  dangerText: { color: '#E11D48', fontWeight: '800', fontSize: 14 },
  ok: {
    marginBottom: 10,
    color: '#047857',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
  },
  err: {
    marginBottom: 10,
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
  },
});
