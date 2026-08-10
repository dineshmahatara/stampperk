import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radii } from '../theme';
import { PrimaryButton } from '../ui';
import { OfflineBanner, readCachedWallet, useOfflineOptional } from '../offline';
import { LogoImage } from '../components/LogoImage';
import type { Session } from './LoginScreen';

type WalletCard = {
  id: string;
  stampCount: number;
  availableRewards: number;
  completedCycles?: number;
  program: {
    title: string;
    totalStamps: number;
    rewardTitle: string;
    stampColor?: string | null;
    logoUrl?: string | null;
    merchant: {
      businessName: string;
      slug: string;
      logoUrl?: string | null;
    };
  };
  redemptions?: Array<{
    id: string;
    rewardTitle: string;
    createdAt: string;
    estimatedSavings?: number | null;
  }>;
};

type Notif = { id: string; title: string; body: string; read: boolean; createdAt: string };
type Offer = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  merchant?: { businessName: string; slug: string };
};

function ProgressRing({ value, max }: { value: number; max: number }) {
  const size = 88;
  const r = 32;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const filled = pct * c;
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88">
      <Circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
      <Circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        rotation="-90"
        origin="44, 44"
      />
      <SvgText x="44" y="42" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800">
        {value}/{max}
      </SvgText>
      <SvgText x="44" y="56" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="8" fontWeight="700">
        Stamps
      </SvgText>
    </Svg>
  );
}

export function CustomerHomeScreen({
  session,
  onGoCards,
  onGoRewards,
  onGoDiscover,
}: {
  session: Session;
  onGoCards?: () => void;
  onGoRewards?: () => void;
  onGoDiscover?: () => void;
}) {
  const offline = useOfflineOptional();
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [msg, setMsg] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [period, setPeriod] = useState<'month' | 'all'>('month');

  const load = useCallback(() => {
    api<WalletCard[]>('/loyalty/cards/me', { token: session.token })
      .then(async (data) => {
        setCards(data);
        setFromCache(false);
        await offline?.rememberWallet(data);
      })
      .catch(async () => {
        const cached = await readCachedWallet<WalletCard[]>();
        if (cached?.data) {
          setCards(cached.data);
          setFromCache(true);
        } else setCards([]);
      });
    api<Notif[]>('/notifications', { token: session.token })
      .then(setNotifs)
      .catch(() => setNotifs([]));
    api<Offer[]>('/campaigns/discover', { token: session.token })
      .then(setOffers)
      .catch(() => setOffers([]));
  }, [session.token, offline]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = notifs.filter((n) => !n.read).length;

  const featured = useMemo(() => {
    if (!cards.length) return null;
    return [...cards].sort((a, b) => {
      if (b.availableRewards !== a.availableRewards) return b.availableRewards - a.availableRewards;
      const pa = a.program.totalStamps ? a.stampCount / a.program.totalStamps : 0;
      const pb = b.program.totalStamps ? b.stampCount / b.program.totalStamps : 0;
      return pb - pa;
    })[0];
  }, [cards]);

  const activity = useMemo(() => {
    const cutoff =
      period === 'month'
        ? (() => {
            const d = new Date();
            d.setDate(1);
            d.setHours(0, 0, 0, 0);
            return d;
          })()
        : null;
    let redeemed = 0;
    let saved = 0;
    for (const c of cards) {
      for (const r of c.redemptions || []) {
        if (cutoff && new Date(r.createdAt) < cutoff) continue;
        redeemed += 1;
        saved += r.estimatedSavings ?? 150;
      }
    }
    const stamps =
      period === 'month'
        ? cards.reduce((s, c) => s + (c.stampCount || 0), 0)
        : cards.reduce(
            (s, c) =>
              s + (c.completedCycles || 0) * (c.program.totalStamps || 0) + (c.stampCount || 0),
            0,
          );
    return { stamps, redeemed, saved };
  }, [cards, period]);

  const recentRedeems = useMemo(() => {
    const rows: Array<{
      id: string;
      rewardTitle: string;
      createdAt: string;
      businessName: string;
    }> = [];
    for (const c of cards) {
      for (const r of c.redemptions || []) {
        rows.push({
          id: r.id,
          rewardTitle: r.rewardTitle,
          createdAt: r.createdAt,
          businessName: c.program.merchant.businessName,
        });
      }
    }
    return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);
  }, [cards]);

  const readyCards = cards.filter((c) => c.availableRewards > 0);
  const firstName = (session.user.name || 'there').split(' ')[0];
  const totalStampsAll = useMemo(
    () =>
      cards.reduce(
        (s, c) =>
          s + (c.completedCycles || 0) * (c.program.totalStamps || 0) + (c.stampCount || 0),
        0,
      ),
    [cards],
  );
  const away = featured
    ? Math.max(0, (featured.program.totalStamps || 0) - (featured.stampCount || 0))
    : 0;

  async function redeem(cardId: string) {
    setRedeemingId(cardId);
    setMsg('');
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
    } finally {
      setRedeemingId(null);
    }
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH', token: session.token }).catch(
      () => undefined,
    );
    setNotifs((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const quick = [
    { label: 'My Cards', icon: 'card' as const, tint: '#EDE9FE', color: '#6D28D9', onPress: onGoCards },
    { label: 'Rewards', icon: 'gift' as const, tint: '#FFEDD5', color: '#C2410C', onPress: onGoRewards },
    {
      label: 'Find Stores',
      icon: 'storefront' as const,
      tint: '#D1FAE5',
      color: '#047857',
      onPress: onGoDiscover,
    },
    { label: 'Promotions', icon: 'pricetag' as const, tint: '#DBEAFE', color: '#1D4ED8', onPress: onGoRewards },
  ];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={s.pad}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>Hello, {firstName}! 👋</Text>
            <Text style={s.sub}>Collect stamps, earn rewards, enjoy more!</Text>
          </View>
          <Pressable style={s.iconBtn} onPress={() => setInboxOpen(true)}>
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
            {unread > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <OfflineBanner token={session.token} />
        {fromCache && (
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            Showing cached cards (offline)
          </Text>
        )}
        {!!msg && (
          <Text style={{ color: colors.coral, fontWeight: '700', marginBottom: 8 }}>{msg}</Text>
        )}

        <View style={s.totalStampsCard}>
          <Text style={s.totalStampsLabel}>My Total Stamps</Text>
          <Text style={s.totalStampsValue}>{totalStampsAll.toLocaleString()}</Text>
          <Text style={s.totalStampsHint}>
            Across {cards.length} active program{cards.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Active programs</Text>
          <Pressable onPress={onGoCards}>
            <Text style={s.link}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
          {cards.map((c) => (
            <Pressable key={`prog-${c.id}`} style={s.programCard} onPress={onGoCards}>
              <View
                style={[
                  s.programBanner,
                  { backgroundColor: c.program.stampColor || colors.coral },
                ]}
              >
                {c.program.logoUrl || c.program.merchant.logoUrl ? (
                  <LogoImage
                    uri={c.program.logoUrl || c.program.merchant.logoUrl || ''}
                    size={40}
                    borderRadius={10}
                  />
                ) : (
                  <Text style={s.storeInitial}>{c.program.merchant.businessName.slice(0, 1)}</Text>
                )}
              </View>
              <Text style={s.programName} numberOfLines={1}>
                {c.program.merchant.businessName}
              </Text>
              <Text style={s.programMeta} numberOfLines={1}>
                {c.program.title}
              </Text>
              <Text style={s.programProgress}>
                {c.stampCount}/{c.program.totalStamps} stamps
              </Text>
            </Pressable>
          ))}
          {!cards.length && (
            <Pressable style={s.programEmpty} onPress={onGoDiscover}>
              <Ionicons name="storefront-outline" size={22} color={colors.coral} />
              <Text style={s.empty}>Discover stores to join</Text>
            </Pressable>
          )}
        </ScrollView>

        {featured && (
          <View
            style={[
              s.hero,
              { backgroundColor: featured.program.stampColor || colors.coral },
            ]}
          >
            <View style={s.heroRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.heroEyebrow}>YOUR LOYALTY CARD</Text>
                <Text style={s.heroTitle} numberOfLines={1}>
                  {featured.program.merchant.businessName}
                </Text>
                <View style={s.memberPill}>
                  <Text style={s.memberText}>
                    ★ {(featured.completedCycles || 0) > 0 ? 'Gold Member' : 'Member'}
                  </Text>
                </View>
                <Text style={s.heroCopy}>
                  {featured.availableRewards > 0
                    ? `You have ${featured.availableRewards} reward ready to redeem!`
                    : away === 0
                      ? 'Card complete — claim your reward!'
                      : `You're ${away} stamp${away === 1 ? '' : 's'} away from earning a free reward!`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.cardId}>Card ID: {featured.id.slice(-6).toUpperCase()}</Text>
                <ProgressRing
                  value={featured.stampCount}
                  max={featured.program.totalStamps || 10}
                />
              </View>
            </View>
            <Pressable style={s.nextReward} onPress={onGoRewards}>
              <Text style={s.nextRewardText}>🎁  Next Reward: {featured.program.rewardTitle}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.coral} />
            </Pressable>
            {featured.availableRewards > 0 && (
              <Pressable
                style={s.heroRedeem}
                onPress={() => redeem(featured.id)}
                disabled={redeemingId === featured.id}
              >
                <Text style={s.heroRedeemText}>
                  {redeemingId === featured.id ? 'Redeeming…' : 'Redeem now'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>My available rewards</Text>
          <Pressable onPress={onGoRewards}>
            <Text style={s.link}>View All</Text>
          </Pressable>
        </View>
        <View style={s.rewardGrid}>
          {readyCards.slice(0, 4).map((c) => (
            <View key={`avail-${c.id}`} style={s.rewardTile}>
              <Text style={s.rewardTileTitle} numberOfLines={2}>
                {c.program.rewardTitle}
              </Text>
              <Text style={s.rewardTileMeta} numberOfLines={1}>
                {c.program.merchant.businessName}
              </Text>
              <Pressable style={s.miniRedeem} onPress={() => redeem(c.id)}>
                <Text style={s.miniRedeemText}>
                  {redeemingId === c.id ? '…' : 'Redeem'}
                </Text>
              </Pressable>
            </View>
          ))}
          {!readyCards.length && (
            <Text style={[s.empty, { width: '100%' }]}>No rewards ready — keep collecting stamps.</Text>
          )}
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Past redemptions</Text>
          <Pressable onPress={onGoRewards}>
            <Text style={s.link}>View All</Text>
          </Pressable>
        </View>
        {recentRedeems.length ? (
          recentRedeems.map((r) => (
            <View key={`past-${r.id}`} style={s.pastRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.rewardTitle} numberOfLines={1}>
                  {r.rewardTitle}
                </Text>
                <Text style={s.rewardMeta}>
                  {r.businessName} · {new Date(r.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={s.redeemedPill}>
                <Text style={s.redeemedText}>Redeemed</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.empty}>No redemptions yet.</Text>
        )}

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Quick actions</Text>
          <Pressable onPress={onGoDiscover}>
            <Text style={s.link}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
          {quick.map((q) => (
            <Pressable key={q.label} style={s.quickItem} onPress={q.onPress}>
              <View style={[s.quickIcon, { backgroundColor: q.tint }]}>
                <Ionicons name={q.icon} size={22} color={q.color} />
              </View>
              <Text style={s.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.twoCol}>
          <View style={s.panel}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Your Activity</Text>
              <Pressable onPress={() => setPeriod((p) => (p === 'month' ? 'all' : 'month'))}>
                <Text style={s.periodChip}>{period === 'month' ? 'This Month' : 'All time'}</Text>
              </Pressable>
            </View>
            {[
              { label: 'Stamps Collected', value: String(activity.stamps), color: '#E11D48' },
              { label: 'Rewards Redeemed', value: String(activity.redeemed), color: '#6D28D9' },
              {
                label: 'Total Saved',
                value: `Rs. ${activity.saved.toLocaleString()}`,
                color: '#047857',
              },
            ].map((row) => (
              <View key={row.label} style={s.activityRow}>
                <Text style={s.activityLabel}>{row.label}</Text>
                <Text style={[s.activityValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
            <Pressable style={s.outlineBtn} onPress={onGoCards}>
              <Text style={s.outlineBtnText}>View Activity →</Text>
            </Pressable>
          </View>

          <View style={s.panel}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Recent Rewards</Text>
              <Pressable onPress={onGoRewards}>
                <Text style={s.link}>View All</Text>
              </Pressable>
            </View>
            {readyCards.slice(0, 2).map((c) => (
              <View key={`ready-${c.id}`} style={s.rewardReady}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rewardTitle} numberOfLines={1}>
                    {c.program.rewardTitle}
                  </Text>
                  <Text style={s.rewardMeta} numberOfLines={1}>
                    {c.program.merchant.businessName}
                  </Text>
                </View>
                <Pressable onPress={() => redeem(c.id)} style={s.miniRedeem}>
                  <Text style={s.miniRedeemText}>Redeem</Text>
                </Pressable>
              </View>
            ))}
            {recentRedeems.map((r) => (
              <View key={r.id} style={s.rewardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rewardTitle} numberOfLines={1}>
                    {r.rewardTitle}
                  </Text>
                  <Text style={s.rewardMeta} numberOfLines={1}>
                    {r.businessName} · {new Date(r.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={s.redeemedPill}>
                  <Text style={s.redeemedText}>Redeemed</Text>
                </View>
              </View>
            ))}
            {!readyCards.length && !recentRedeems.length && (
              <Text style={s.empty}>No rewards yet — keep collecting stamps.</Text>
            )}
          </View>
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Your favorite stores</Text>
          <Pressable onPress={onGoDiscover}>
            <Text style={s.link}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {cards.map((c) => (
            <View key={`fav-${c.id}`} style={s.storeCard}>
              <View
                style={[
                  s.storeLogo,
                  { backgroundColor: c.program.stampColor || colors.coral },
                ]}
              >
                {c.program.logoUrl || c.program.merchant.logoUrl ? (
                  <LogoImage
                    uri={c.program.logoUrl || c.program.merchant.logoUrl || ''}
                    size={48}
                    borderRadius={12}
                  />
                ) : (
                  <Text style={s.storeInitial}>{c.program.merchant.businessName.slice(0, 1)}</Text>
                )}
              </View>
              <Text style={s.storeName} numberOfLines={1}>
                {c.program.merchant.businessName}
              </Text>
              <Text style={s.storeProgress}>
                {c.stampCount}/{c.program.totalStamps} Stamps
              </Text>
            </View>
          ))}
          {!cards.length && <Text style={s.empty}>Join a store to see favorites here.</Text>}
        </ScrollView>

        <View style={s.offers}>
          <Text style={s.offersTitle}>Special Offers for You! 🎉</Text>
          <Text style={s.offersSub}>
            {offers.length
              ? `${offers.length} active deal${offers.length === 1 ? '' : 's'} from your stores.`
              : 'Check out exciting deals from your favorite stores.'}
          </Text>
          {offers[0] && (
            <Text style={s.offerHighlight}>
              {offers[0].badgeText}: {offers[0].title} · {offers[0].merchant?.businessName}
            </Text>
          )}
          <Pressable style={s.offerCta} onPress={onGoRewards}>
            <Text style={s.offerCtaText}>Explore Deals →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={inboxOpen} animationType="slide" transparent onRequestClose={() => setInboxOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setInboxOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sectionTitle}>Notifications</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {notifs.slice(0, 12).map((n) => (
                <Pressable
                  key={n.id}
                  style={[s.notifRow, !n.read && { backgroundColor: colors.pink }]}
                  onPress={() => markRead(n.id)}
                >
                  <Text style={s.rewardTitle}>{n.title}</Text>
                  <Text style={s.rewardMeta}>{n.body}</Text>
                </Pressable>
              ))}
              {!notifs.length && <Text style={s.empty}>No notifications yet.</Text>}
            </ScrollView>
            <PrimaryButton label="Close" onPress={() => setInboxOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hello: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  sub: { marginTop: 4, fontSize: 13, color: colors.muted },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  success: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    fontWeight: '700',
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hero: { borderRadius: 24, padding: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  memberPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FBBF24',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberText: { color: '#78350F', fontSize: 11, fontWeight: '800' },
  heroCopy: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', marginTop: 12 },
  cardId: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', marginBottom: 8 },
  nextReward: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextRewardText: { color: colors.ink, fontSize: 13, fontWeight: '700', flex: 1 },
  heroRedeem: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroRedeemText: { color: colors.coral, fontWeight: '800', fontSize: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  link: { color: colors.coral, fontWeight: '700', fontSize: 13 },
  quickRow: { gap: 10, paddingVertical: 4 },
  quickItem: {
    width: 84,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: colors.ink },
  twoCol: { gap: 12 },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  periodChip: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#F8F8FA',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    color: colors.ink,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  activityLabel: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  activityValue: { fontWeight: '800', fontSize: 14 },
  outlineBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineBtnText: { fontWeight: '700', fontSize: 13, color: colors.ink },
  rewardReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  rewardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  rewardMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  miniRedeem: {
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniRedeemText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  totalStampsCard: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    padding: 18,
    marginBottom: 4,
  },
  totalStampsLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 },
  totalStampsValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 40,
    letterSpacing: -1,
    marginTop: 4,
  },
  totalStampsHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  programCard: {
    width: 148,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  programBanner: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  programName: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  programMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  programProgress: { color: colors.coral, fontWeight: '800', fontSize: 12, marginTop: 8 },
  programEmpty: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardTile: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
  },
  rewardTileTitle: { fontWeight: '800', color: colors.ink, fontSize: 13, minHeight: 34 },
  rewardTileMeta: { color: colors.muted, fontSize: 11 },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  redeemedPill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  redeemedText: { color: '#047857', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.muted, fontSize: 13 },
  storeCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  storeInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  storeName: { fontWeight: '700', fontSize: 13, color: colors.ink },
  storeProgress: { marginTop: 4, color: colors.coral, fontWeight: '700', fontSize: 11 },
  offers: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253,186,116,0.4)',
    padding: 18,
  },
  offersTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  offersSub: { marginTop: 6, fontSize: 13, color: colors.muted },
  offerHighlight: { marginTop: 8, color: colors.coral, fontWeight: '700', fontSize: 13 },
  offerCta: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offerCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  notifRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F8F8FA',
  },
});
