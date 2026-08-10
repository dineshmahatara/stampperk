import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors, styles } from '../theme';
import { Card, PrimaryButton, ScreenHeader } from '../ui';
import { OfflineBanner, readCachedWallet, useOfflineOptional } from '../offline';
import type { Session } from './LoginScreen';

type WalletCard = {
  id: string;
  availableRewards: number;
  stampCount: number;
  program: {
    rewardTitle: string;
    totalStamps: number;
    merchant: { businessName: string };
  };
  redemptions?: Array<{ id: string; rewardTitle: string; createdAt: string }>;
};

type Offer = {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  merchant?: { businessName: string };
};

export function CustomerRewardsScreen({ session }: { session: Session }) {
  const offline = useOfflineOptional();
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<WalletCard[]>('/loyalty/cards/me', { token: session.token })
      .then(async (data) => {
        setCards(data);
        await offline?.rememberWallet(data);
      })
      .catch(async () => {
        const cached = await readCachedWallet<WalletCard[]>();
        setCards(cached?.data || []);
      });
    api<Offer[]>('/campaigns/discover', { token: session.token })
      .then(setOffers)
      .catch(() => setOffers([]));
  }, [session.token, offline]);

  useEffect(() => {
    load();
  }, [load]);

  const ready = cards.filter((c) => c.availableRewards > 0);
  const history = useMemo(() => {
    const rows: Array<{ id: string; rewardTitle: string; createdAt: string; businessName: string }> =
      [];
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
    return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [cards]);

  async function redeem(cardId: string) {
    if (offline && !offline.online) {
      setMsg('Redeem needs internet — try again when online');
      return;
    }
    setBusy(cardId);
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
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <ScreenHeader title="Rewards" subtitle="Redeem ready rewards and browse offers" />
        <OfflineBanner token={session.token} />
        {!!msg && <Text style={styles.badge}>{msg}</Text>}

        <Text style={styles.h2}>Ready to redeem</Text>
        {ready.map((c) => (
          <Card key={c.id}>
            <Text style={styles.cardTitle}>{c.program.rewardTitle}</Text>
            <Text style={styles.muted}>
              {c.program.merchant.businessName} · {c.availableRewards} ready
            </Text>
            <PrimaryButton
              label={busy === c.id ? 'Redeeming…' : 'Redeem'}
              onPress={() => redeem(c.id)}
              disabled={busy === c.id}
            />
          </Card>
        ))}
        {!ready.length && (
          <Card>
            <Text style={styles.muted}>No rewards ready yet — keep collecting stamps.</Text>
          </Card>
        )}

        <Text style={styles.h2}>Special offers</Text>
        {offers.map((o) => (
          <Card key={o.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={styles.cardTitle}>{o.title}</Text>
              <View
                style={{
                  backgroundColor: colors.pink,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.coral, fontWeight: '800', fontSize: 11 }}>
                  {o.badgeText}
                </Text>
              </View>
            </View>
            <Text style={styles.muted}>
              {o.merchant?.businessName}
              {o.description ? ` · ${o.description}` : ''}
            </Text>
          </Card>
        ))}
        {!offers.length && (
          <Card>
            <Text style={styles.muted}>No active offers from your stores right now.</Text>
          </Card>
        )}

        <Text style={styles.h2}>Recent redemptions</Text>
        {history.map((r) => (
          <Card key={r.id}>
            <Text style={styles.cardTitle}>{r.rewardTitle}</Text>
            <Text style={styles.muted}>
              {r.businessName} · {new Date(r.createdAt).toLocaleDateString()}
            </Text>
            <Pressable>
              <Text style={{ color: '#047857', fontWeight: '800', fontSize: 12 }}>Redeemed</Text>
            </Pressable>
          </Card>
        ))}
        {!history.length && (
          <Card>
            <Text style={styles.muted}>No redemptions yet.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
