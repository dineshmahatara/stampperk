import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles as theme } from '../theme';
import { PrimaryButton, Card } from '../ui';
import { api } from '../api';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';

type ContentType = 'GENERAL' | 'LOYALTY_CARD' | 'OFFER';
type Audience = 'LOYALTY_CUSTOMERS' | 'NEAR_AREA' | 'CUSTOMERS_AND_OUTSIDE';

type Program = {
  id: string;
  title: string;
  rewardTitle: string;
  rewardDescription?: string | null;
  stampColor?: string | null;
  active: boolean;
};

type Campaign = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  status: string;
};

export function PushSendWizard({
  token,
  onDone,
  onCancel,
}: {
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'wizard'>('intro');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [programId, setProgramId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('LOYALTY_CUSTOMERS');
  const [radiusKm, setRadiusKm] = useState('5');
  const [eligible, setEligible] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState('');
  const [merchantName, setMerchantName] = useState('Your business');

  useEffect(() => {
    api<Program[]>('/loyalty/programs', { token })
      .then((list) => setPrograms(list.filter((p) => p.active !== false)))
      .catch(() => undefined);
    api<{ campaigns: Campaign[] }>('/campaigns', { token })
      .then((res) => setCampaigns((res.campaigns || []).filter((c) => c.status === 'ACTIVE')))
      .catch(() => undefined);
    api<{ businessName?: string }>('/merchants/me', { token })
      .then((m) => setMerchantName(m.businessName || 'Your business'))
      .catch(() => undefined);
  }, [token]);

  const refreshEstimate = useCallback(async () => {
    try {
      const res = await api<{ eligible: number }>('/notifications/merchant/estimate', {
        method: 'POST',
        token,
        body: JSON.stringify({ audience, radiusKm: Number(radiusKm) || 5 }),
      });
      setEligible(res.eligible);
    } catch {
      setEligible(0);
    }
  }, [token, audience, radiusKm]);

  useEffect(() => {
    if (phase === 'wizard' && step === 3) refreshEstimate();
  }, [phase, step, refreshEstimate]);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => p.title.toLowerCase().includes(q));
  }, [programs, search]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => c.title.toLowerCase().includes(q));
  }, [campaigns, search]);

  function canContinue() {
    if (step === 0) return Boolean(contentType);
    if (step === 1) {
      if (contentType === 'GENERAL') return true;
      if (contentType === 'LOYALTY_CARD') return Boolean(programId);
      if (contentType === 'OFFER') return Boolean(campaignId);
    }
    if (step === 2) return title.trim().length > 0 && body.trim().length > 0;
    if (step === 3) return Boolean(audience);
    if (step === 4) return eligible > 0;
    return false;
  }

  function next() {
    setError('');
    if (!canContinue()) {
      setError(step === 4 ? 'No customers match this audience.' : 'Complete this step to continue');
      return;
    }
    if (step === 0 && contentType === 'GENERAL') {
      setStep(2);
      return;
    }
    if (step < 4) setStep((s) => s + 1);
  }

  function back() {
    setError('');
    if (step === 2 && contentType === 'GENERAL') {
      setStep(0);
      return;
    }
    if (step === 0) {
      setPhase('intro');
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  async function confirmSend() {
    if (!contentType || eligible <= 0) {
      setError('No customers match this audience.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/notifications/merchant/send', {
        method: 'POST',
        token,
        body: JSON.stringify({
          contentType,
          title: title.trim(),
          body: body.trim(),
          programId: contentType === 'LOYALTY_CARD' ? programId : undefined,
          campaignId: contentType === 'OFFER' ? campaignId : undefined,
          audience,
          radiusKm: Number(radiusKm) || 5,
        }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'intro') {
    return (
      <SafeAreaView style={theme.screen} edges={['top', 'bottom']}>
        <KeyboardAwareScroll contentContainerStyle={theme.pad} bottomExtra={80}>
          <Pressable onPress={onCancel}>
            <Text style={{ color: colors.coral, fontWeight: '800', marginBottom: 12 }}>← Back</Text>
          </Pressable>
          <Text style={s.h1}>
            Reach customers and <Text style={{ color: colors.coral }}>bring them back</Text>
          </Text>
          <Text style={theme.muted}>
            Send offers, loyalty cards, or custom messages with free app notifications.
          </Text>
          <Card>
            <Text style={theme.sectionLabel}>What you can do</Text>
            <Text style={s.bullet}>• Promote existing offers or loyalty cards</Text>
            <Text style={s.bullet}>• Free app notifications</Text>
            <Text style={s.bullet}>• Choose audience and send instantly</Text>
          </Card>
          <PrimaryButton label="Start Sending →" onPress={() => setPhase('wizard')} />
        </KeyboardAwareScroll>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={theme.pad} bottomExtra={100}>
        <View style={s.stepRow}>
          <Pressable onPress={back} style={s.backBtn}>
            <Text style={{ color: colors.coral, fontWeight: '800' }}>←</Text>
          </Pressable>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.dot, i <= step && s.dotOn]}>
              <Text style={[s.dotText, i <= step && s.dotTextOn]}>{i < step ? '✓' : i + 1}</Text>
            </View>
          ))}
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}

        {step === 0 && (
          <View>
            <Text style={s.h1}>
              What do you want to <Text style={{ color: colors.coral }}>send?</Text>
            </Text>
            {(
              [
                ['OFFER', 'Send Offer', 'Share an existing offer'],
                ['LOYALTY_CARD', 'Send Loyalty Card', 'Promote an existing loyalty card'],
                ['GENERAL', 'General Message', 'Custom message or announcement'],
              ] as const
            ).map(([id, t, d]) => (
              <Pressable
                key={id}
                onPress={() => {
                  setContentType(id);
                  setProgramId('');
                  setCampaignId('');
                }}
                style={[s.option, contentType === id && s.optionOn]}
              >
                <Text style={s.optionTitle}>{t}</Text>
                <Text style={theme.muted}>{d}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 1 && contentType === 'LOYALTY_CARD' && (
          <View>
            <Text style={s.h1}>Select Loyalty Card</Text>
            <TextInput style={theme.input} placeholder="Search..." value={search} onChangeText={setSearch} />
            {filteredPrograms.map((p) => (
              <Pressable key={p.id} onPress={() => {
                setProgramId(p.id);
                setTitle(p.title.slice(0, 60));
                setBody((p.rewardDescription || `Unlock ${p.rewardTitle}`).slice(0, 160));
              }} style={[s.option, programId === p.id && s.optionOn]}>
                <Text style={s.optionTitle}>{p.title}</Text>
                <Text style={theme.muted}>Active</Text>
              </Pressable>
            ))}
            {!filteredPrograms.length && <Text style={theme.muted}>No loyalty cards yet.</Text>}
          </View>
        )}

        {step === 1 && contentType === 'OFFER' && (
          <View>
            <Text style={s.h1}>Select Offer</Text>
            <TextInput style={theme.input} placeholder="Search offers..." value={search} onChangeText={setSearch} />
            {filteredCampaigns.map((c) => (
              <Pressable key={c.id} onPress={() => {
                setCampaignId(c.id);
                setTitle(c.title.slice(0, 60));
                setBody(c.description.slice(0, 160));
              }} style={[s.option, campaignId === c.id && s.optionOn]}>
                <Text style={s.optionTitle}>{c.title}</Text>
                <Text style={theme.muted}>{c.badgeText}</Text>
              </Pressable>
            ))}
            {!filteredCampaigns.length && (
              <Card>
                <Text style={s.optionTitle}>No current active offer</Text>
                <Text style={theme.muted}>Publish an offer from Campaigns, then return here.</Text>
              </Card>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.h1}>Compose your message</Text>
            <Text style={theme.sectionLabel}>Title ({title.length}/60)</Text>
            <TextInput style={theme.input} maxLength={60} value={title} onChangeText={setTitle} />
            <Text style={theme.sectionLabel}>Message ({body.length}/160)</Text>
            <TextInput
              style={[theme.input, { minHeight: 90, textAlignVertical: 'top' }]}
              multiline
              maxLength={160}
              value={body}
              onChangeText={setBody}
            />
            <Card>
              <Text style={{ color: colors.coral, fontWeight: '800', fontSize: 11 }}>{merchantName} · now</Text>
              <Text style={s.optionTitle}>{title || 'Title'}</Text>
              <Text style={theme.muted}>{body || 'Message'}</Text>
            </Card>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={s.h1}>
              Who will receive this <Text style={{ color: colors.coral }}>message?</Text>
            </Text>
            {(
              [
                ['LOYALTY_CUSTOMERS', 'Only Your Customers', 'Everyone with one of your loyalty cards'],
                ['NEAR_AREA', 'People Near This Area', 'Users inside the selected radius'],
                ['CUSTOMERS_AND_OUTSIDE', 'Customers + People Nearby', 'Union including customers outside radius'],
              ] as const
            ).map(([id, t, d]) => (
              <Pressable key={id} onPress={() => setAudience(id)} style={[s.option, audience === id && s.optionOn]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.optionTitle}>{t}</Text>
                  <Text style={theme.muted}>{audience === id ? `${eligible} Eligible` : '—'}</Text>
                </View>
                <Text style={theme.muted}>{d}</Text>
              </Pressable>
            ))}
            {(audience === 'NEAR_AREA' || audience === 'CUSTOMERS_AND_OUTSIDE') && (
              <>
                <Text style={theme.sectionLabel}>Radius (km)</Text>
                <TextInput style={theme.input} keyboardType="decimal-pad" value={radiusKm} onChangeText={setRadiusKm} />
              </>
            )}
            <Text style={[theme.muted, { marginTop: 8 }]}>{eligible} estimated sendable</Text>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={s.h1}>
              Review and <Text style={{ color: colors.coral }}>confirm</Text>
            </Text>
            <Card>
              <Text style={s.optionTitle}>{title}</Text>
              <Text style={theme.muted}>{body}</Text>
            </Card>
            <Card>
              <Text style={s.bullet}>Content: {contentType}</Text>
              <Text style={s.bullet}>Audience: {audience}</Text>
              <Text style={s.bullet}>Recipients: {eligible}</Text>
              <Text style={s.bullet}>Channel: App Notification</Text>
            </Card>
            {eligible <= 0 && <Text style={s.error}>No customers match this audience.</Text>}
          </View>
        )}

        {step < 4 ? (
          <PrimaryButton label="Continue →" onPress={next} disabled={!canContinue()} />
        ) : (
          <PrimaryButton
            label={busy ? 'Sending…' : 'Confirm & Send'}
            onPress={confirmSend}
            disabled={busy || eligible <= 0}
          />
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  bullet: { fontSize: 13, color: colors.ink, marginBottom: 6, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.coral },
  dotText: { fontSize: 11, fontWeight: '800', color: colors.muted },
  dotTextOn: { color: '#fff' },
  option: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  optionOn: { borderColor: colors.coral, backgroundColor: '#FFF5F6' },
  optionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 8 },
});
