import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { PLAN_LIMITS } from '@stampperk/shared';
import { api, getActiveMerchantId, setActiveMerchantId } from '../api';
import { colors } from '../theme';
import { PrimaryButton } from '../ui';
import { LogoImage } from './LogoImage';

export type BusinessOption = {
  id: string;
  businessName: string;
  city?: string | null;
  logoUrl?: string | null;
  subscription?: { plan?: string } | null;
};

export function BusinessSwitcher({
  token,
  onSwitched,
  compact,
  allowCreate = true,
}: {
  token: string;
  onSwitched?: () => void;
  compact?: boolean;
  /** Owner-only: create additional businesses within plan limits */
  allowCreate?: boolean;
}) {
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Cafe & Coffee');
  const [newCity, setNewCity] = useState('Kathmandu');

  const load = useCallback(async () => {
    try {
      const list = await api<BusinessOption[]>('/merchants/mine', {
        token,
        merchantId: null,
      });
      setBusinesses(list);
      let preferred = await getActiveMerchantId();
      if (!preferred || !list.some((b) => b.id === preferred)) {
        preferred = list[0]?.id || null;
        await setActiveMerchantId(preferred);
      }
      setActiveId(preferred);
    } catch {
      setBusinesses([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const active = businesses.find((b) => b.id === activeId) || businesses[0];
  const plan = (active?.subscription?.plan || businesses[0]?.subscription?.plan || 'FREE') as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[plan]?.businesses ?? 1;
  const canAdd = allowCreate && businesses.length < limit;

  async function switchTo(id: string) {
    await setActiveMerchantId(id);
    setActiveId(id);
    setOpen(false);
    onSwitched?.();
  }

  async function createBusiness() {
    if (!newName.trim()) {
      setError('Business name required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api<{ id: string }>('/merchants', {
        method: 'POST',
        token,
        merchantId: null,
        body: JSON.stringify({
          businessName: newName.trim(),
          category: newCategory,
          city: newCity,
          country: 'NP',
        }),
      });
      await setActiveMerchantId(created.id);
      setActiveId(created.id);
      setAdding(false);
      setNewName('');
      setOpen(false);
      await load();
      onSwitched?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create business');
    } finally {
      setBusy(false);
    }
  }

  if (!businesses.length && !active) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[s.trigger, compact && s.triggerCompact]}
      >
        <View style={s.avatar}>
          {active?.logoUrl ? (
            <LogoImage uri={active.logoUrl} size={36} borderRadius={10} />
          ) : (
            <Text style={s.avatarText}>{(active?.businessName || 'B').slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.triggerLabel}>Active business</Text>
          <Text style={s.triggerName} numberOfLines={1}>
            {active?.businessName || 'Select business'}
          </Text>
        </View>
        <Text style={s.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
          <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Your businesses</Text>
          <Text style={s.sheetSub}>
            {businesses.length}/{limit} on {plan} plan
          </Text>

          <ScrollView
            style={{ maxHeight: adding ? 180 : 320 }}
            keyboardShouldPersistTaps="handled"
          >
            {businesses.map((b) => {
              const selected = b.id === activeId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => switchTo(b.id)}
                  style={[s.row, selected && s.rowOn]}
                >
                  <View style={[s.avatar, selected && !b.logoUrl && { backgroundColor: colors.coral }]}>
                    {b.logoUrl ? (
                      <LogoImage uri={b.logoUrl} size={36} borderRadius={10} />
                    ) : (
                      <Text style={[s.avatarText, selected && { color: '#fff' }]}>
                        {b.businessName.slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{b.businessName}</Text>
                    <Text style={s.rowMeta}>
                      {[b.city, b.subscription?.plan].filter(Boolean).join(' · ') || 'Business'}
                    </Text>
                  </View>
                  {selected ? <Text style={s.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {canAdd && !adding && (
            <Pressable onPress={() => setAdding(true)} style={s.addBtn}>
              <Text style={s.addText}>+ Add business</Text>
            </Pressable>
          )}

          {!canAdd && allowCreate && (
            <Text style={s.limitNote}>
              Upgrade plan to add more businesses (FREE 1 · MONTHLY 5 · YEARLY 10).
            </Text>
          )}

          {adding && (
            <View style={s.addForm}>
              <Text style={s.formLabel}>Business name</Text>
              <TextInput style={s.input} value={newName} onChangeText={setNewName} placeholder="e.g. Brew & Bean" />
              <Text style={s.formLabel}>Category</Text>
              <TextInput style={s.input} value={newCategory} onChangeText={setNewCategory} />
              <Text style={s.formLabel}>City</Text>
              <TextInput style={s.input} value={newCity} onChangeText={setNewCity} />
              {!!error && <Text style={s.error}>{error}</Text>}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Cancel" outline onPress={() => setAdding(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={busy ? 'Creating…' : 'Create'}
                    onPress={createBusiness}
                    disabled={busy}
                  />
                </View>
              </View>
            </View>
          )}

          {busy && !adding && <ActivityIndicator color={colors.coral} style={{ marginTop: 12 }} />}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  triggerCompact: { marginBottom: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFE8EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontWeight: '900', color: colors.coral, fontSize: 14 },
  triggerLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  triggerName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  chevron: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  sheetSub: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 4,
  },
  rowOn: { backgroundColor: '#FFF5F6' },
  rowTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  rowMeta: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  check: { color: colors.coral, fontWeight: '900', fontSize: 16 },
  addBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.coral,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: { color: colors.coral, fontWeight: '800' },
  limitNote: { marginTop: 10, fontSize: 12, color: colors.muted, fontWeight: '600' },
  addForm: { marginTop: 12, gap: 4 },
  formLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '600',
    backgroundColor: '#F4F5F7',
  },
  error: { color: '#DC2626', fontWeight: '700', marginTop: 6 },
});
