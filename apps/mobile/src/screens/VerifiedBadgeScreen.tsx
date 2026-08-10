import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { PrimaryButton, ScreenHeader } from '../ui';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { VERIFIED_ADDON_PRICES } from '@stampz/shared';
import type { Session } from './LoginScreen';

type VerificationState = {
  verificationStatus: string;
  verified: boolean;
  canPay: boolean;
  canApply: boolean;
  verifiedUntil?: string | null;
  verificationNote?: string | null;
  registrationNumber?: string | null;
  panVatNumber?: string | null;
};

export function VerifiedBadgeScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const [v, setV] = useState<VerificationState | null>(null);
  const [reg, setReg] = useState('');
  const [pan, setPan] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<VerificationState>('/merchants/me/verification', {
        token: session.token,
      });
      setV(res);
      setReg(res.registrationNumber || '');
      setPan(res.panVatNumber || '');
      setMsg('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (!docUrl.trim()) {
      setMsg('Paste at least one document URL (upload via web or media CDN)');
      return;
    }
    setBusy(true);
    try {
      await api('/merchants/me/verification', {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          registrationNumber: reg || undefined,
          panVatNumber: pan || undefined,
          docUrls: [docUrl.trim()],
        }),
      });
      setMsg('Submitted for admin review');
      setDocUrl('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  }

  async function pay(interval: 'monthly' | 'yearly') {
    setBusy(true);
    try {
      const res = await api<{ mode: string; url?: string | null }>(
        '/billing/verified/checkout',
        {
          method: 'POST',
          token: session.token,
          body: JSON.stringify({ interval }),
        },
      );
      if (res.url) {
        Alert.alert('Checkout', 'Open the Stripe link from web billing to complete payment.');
      } else {
        setMsg('Verified add-on activated');
        await load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Checkout failed');
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
          title="Stampz Verified"
          subtitle="Trust badge · Discover boost · recurring add-on"
        />

        <View style={s.hero}>
          <Ionicons name="checkmark-circle" size={36} color={colors.coral} />
          <Text style={s.heroText}>
            ${VERIFIED_ADDON_PRICES.monthly.price}/mo or ${VERIFIED_ADDON_PRICES.yearly.price}/yr
          </Text>
        </View>

        {!!msg && <Text style={s.msg}>{msg}</Text>}
        {!v && <ActivityIndicator color={colors.coral} />}
        {v && (
          <>
            <Text style={s.status}>
              Status: {v.verificationStatus}
              {v.verified ? ' · LIVE' : ''}
            </Text>
            {!!v.verificationNote && <Text style={s.note}>Note: {v.verificationNote}</Text>}

            {v.canApply && (
              <View style={s.card}>
                <Text style={s.label}>Registration number</Text>
                <TextInput style={s.input} value={reg} onChangeText={setReg} />
                <Text style={s.label}>PAN / VAT</Text>
                <TextInput style={s.input} value={pan} onChangeText={setPan} />
                <Text style={s.label}>Document URL</Text>
                <TextInput
                  style={s.input}
                  value={docUrl}
                  onChangeText={setDocUrl}
                  autoCapitalize="none"
                  placeholder="https://…"
                  placeholderTextColor={colors.muted}
                />
                <PrimaryButton label={busy ? 'Submitting…' : 'Submit for review'} onPress={apply} />
              </View>
            )}

            {v.verificationStatus === 'PENDING' && (
              <Text style={s.pending}>Waiting for admin review…</Text>
            )}

            {v.canPay && !v.verified && (
              <View style={{ gap: 10 }}>
                <PrimaryButton
                  label={`Activate monthly · $${VERIFIED_ADDON_PRICES.monthly.price}`}
                  onPress={() => void pay('monthly')}
                />
                <Pressable style={s.outline} onPress={() => void pay('yearly')}>
                  <Text style={s.outlineText}>
                    Yearly · ${VERIFIED_ADDON_PRICES.yearly.price}
                  </Text>
                </Pressable>
              </View>
            )}

            {v.verified && (
              <Text style={s.live}>Your badge is live on Discover and your public profile.</Text>
            )}
          </>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  pad: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
  },
  heroText: { flex: 1, fontWeight: '700', color: colors.ink },
  msg: { color: colors.coral, fontWeight: '700', marginBottom: 10 },
  status: { fontWeight: '800', fontSize: 15, marginBottom: 8 },
  note: { color: colors.muted, marginBottom: 10, fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '600',
    color: colors.ink,
  },
  pending: {
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    fontWeight: '700',
    padding: 12,
    borderRadius: 12,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineText: { color: colors.coral, fontWeight: '800' },
  live: { color: '#047857', fontWeight: '800', marginTop: 8 },
});
