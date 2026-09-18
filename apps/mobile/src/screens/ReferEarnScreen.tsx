import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { PrimaryButton, ScreenHeader } from '../ui';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import type { Session } from './LoginScreen';

type ReferralsMe = {
  referralCode: string;
  shareUrl: string;
  pendingBonusStamps: number;
  stats: { friendsJoined: number; rewarded: number; pending: number };
  recent: {
    id: string;
    status: string;
    scope: string;
    friendName: string;
    merchantName?: string | null;
    createdAt: string;
  }[];
  merchantPrograms: {
    programId: string;
    title: string;
    businessName: string;
    shareUrl: string;
    bonusReferrer: number;
    bonusReferee: number;
  }[];
  platformBonus: { referrer: number; referee: number };
};

export function ReferEarnScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const [data, setData] = useState<ReferralsMe | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api<ReferralsMe>('/referrals/me', { token: session.token });
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyLink(url: string) {
    try {
      await Share.share({ message: url });
      setMsg('Share sheet opened');
    } catch {
      setMsg('Could not share');
    }
  }

  async function shareLink(url: string, title: string) {
    try {
      await Share.share({ message: `${title}\n${url}`, url });
    } catch {
      /* dismissed */
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={s.pad} bottomExtra={40}>
        <Pressable onPress={onBack} style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.coral, fontWeight: '800' }}>← Back</Text>
        </Pressable>
        <ScreenHeader
          title="Refer & Earn"
          subtitle="Invite friends · earn bonus stamps"
        />

        {!!error && <Text style={s.error}>{error}</Text>}
        {!!msg && <Text style={s.ok}>{msg}</Text>}

        {!data ? (
          <ActivityIndicator color={colors.coral} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={s.hero}>
              <Text style={s.heroTitle}>Your invite code</Text>
              <Text style={s.code}>{data.referralCode}</Text>
              <Text style={s.heroSub}>
                Friends join Stamp Perk with your link. After their first stamp, you both get +
                {data.platformBonus.referrer} bonus stamps (applied on your next visit).
              </Text>
              <View style={s.row}>
                <PrimaryButton
                  label="Share invite"
                  onPress={() =>
                    void shareLink(data.shareUrl, 'Join me on Stamp Perk and earn loyalty stamps!')
                  }
                />
                <Pressable style={s.shareBtn} onPress={() => void copyLink(data.shareUrl)}>
                  <Ionicons name="link-outline" size={18} color={colors.coral} />
                  <Text style={s.shareText}>Link</Text>
                </Pressable>
              </View>
              {data.pendingBonusStamps > 0 && (
                <Text style={s.pending}>
                  {data.pendingBonusStamps} bonus stamp
                  {data.pendingBonusStamps === 1 ? '' : 's'} waiting for your next visit
                </Text>
              )}
            </View>

            <View style={s.stats}>
              {[
                ['Joined', data.stats.friendsJoined],
                ['Rewarded', data.stats.rewarded],
                ['Pending', data.stats.pending],
              ].map(([label, value]) => (
                <View key={String(label)} style={s.stat}>
                  <Text style={s.statNum}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {!!data.merchantPrograms.length && (
              <View style={s.block}>
                <Text style={s.blockTitle}>Business referrals</Text>
                <Text style={s.muted}>
                  Share these when a merchant rewards friends who visit them.
                </Text>
                {data.merchantPrograms.map((p) => (
                  <View key={p.programId} style={s.bizRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bizName}>{p.businessName}</Text>
                      <Text style={s.muted}>
                        {p.title} · you +{p.bonusReferrer} / friend +{p.bonusReferee}
                      </Text>
                    </View>
                    <Pressable onPress={() => void copyLink(p.shareUrl)}>
                      <Text style={s.link}>Copy</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={s.block}>
              <Text style={s.blockTitle}>Recent invites</Text>
              {!data.recent.length && (
                <Text style={s.empty}>
                  No friends yet. Share your link — rewards unlock after their first stamp.
                </Text>
              )}
              {data.recent.map((r) => (
                <View key={r.id} style={s.bizRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bizName}>{r.friendName}</Text>
                    <Text style={s.muted}>
                      {r.scope === 'MERCHANT' ? r.merchantName || 'Business' : 'Stamp Perk'} ·{' '}
                      {r.status === 'REWARDED'
                        ? 'Rewarded'
                        : r.status === 'PENDING'
                          ? 'Waiting for first stamp'
                          : r.status}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.badge,
                      r.status === 'REWARDED'
                        ? s.badgeOk
                        : r.status === 'PENDING'
                          ? s.badgeWait
                          : s.badgeMuted,
                    ]}
                  >
                    <Text style={s.badgeText}>{r.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, paddingBottom: 40 },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 8 },
  ok: { color: '#1B7A4A', fontWeight: '700', marginBottom: 8 },
  hero: {
    backgroundColor: '#FFF5F5',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD4D6',
    marginBottom: 14,
  },
  heroTitle: { fontWeight: '800', color: colors.muted, fontSize: 12, textTransform: 'uppercase' },
  code: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.ink,
  },
  heroSub: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.coral,
  },
  shareText: { color: colors.coral, fontWeight: '800' },
  pending: { marginTop: 12, fontWeight: '800', color: '#C27803', fontSize: 13 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECF0',
  },
  statNum: { fontSize: 20, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  block: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECF0',
    marginBottom: 12,
  },
  blockTitle: { fontWeight: '900', fontSize: 15, color: colors.ink, marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  empty: {
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 8,
    lineHeight: 18,
  },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECF0',
  },
  bizName: { fontWeight: '800', color: colors.ink },
  link: { color: colors.coral, fontWeight: '800', fontSize: 13 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#E8F8EF' },
  badgeWait: { backgroundColor: '#FFF4E5' },
  badgeMuted: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.ink },
});
