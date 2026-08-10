import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
import { PrimaryButton } from '../ui';
import { AddressPicker } from '../components/AddressPicker';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import type { AddressFormValue } from '@stampz/shared';
import { normalizeCountryCode } from '@stampz/shared';
import type { Session } from './LoginScreen';

export type ProfileFields = {
  id?: string;
  email?: string;
  name?: string;
  phone?: string | null;
  alternatePhone?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  municipality?: string | null;
  ward?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
};

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={es.field}>
      <Text style={es.label}>{label}</Text>
      <TextInput
        style={es.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboard || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
    </View>
  );
}

export function CustomerProfileEditScreen({
  session,
  initial,
  onBack,
  onSaved,
}: {
  session: Session;
  initial?: ProfileFields | null;
  onBack: () => void;
  onSaved: (profile: ProfileFields) => void;
}) {
  const [name, setName] = useState(initial?.name || session.user.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(initial?.alternatePhone || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initial?.dateOfBirth ? String(initial.dateOfBirth).slice(0, 10) : '',
  );
  const [gender, setGender] = useState(initial?.gender || '');
  const [address, setAddress] = useState<AddressFormValue>({
    country: normalizeCountryCode(initial?.country) || 'NP',
    province: initial?.province || '',
    district: initial?.district || '',
    city: initial?.city || '',
    municipality: initial?.municipality || '',
    ward: initial?.ward || '',
    street: initial?.streetAddress || '',
    postalCode: initial?.postalCode || '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initial?.name || session.user.name || '');
    setPhone(initial?.phone || '');
    setAlternatePhone(initial?.alternatePhone || '');
    setDateOfBirth(initial?.dateOfBirth ? String(initial.dateOfBirth).slice(0, 10) : '');
    setGender(initial?.gender || '');
    setAddress({
      country: normalizeCountryCode(initial?.country) || 'NP',
      province: initial?.province || '',
      district: initial?.district || '',
      city: initial?.city || '',
      municipality: initial?.municipality || '',
      ward: initial?.ward || '',
      street: initial?.streetAddress || '',
      postalCode: initial?.postalCode || '',
    });
  }, [initial, session.user.name]);

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      setError('Birthday must be YYYY-MM-DD');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const updated = await api<ProfileFields>('/users/me', {
        method: 'PATCH',
        token: session.token,
        body: JSON.stringify({
          name: trimmed,
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim(),
          dateOfBirth: dateOfBirth.trim() || '',
          gender: gender || '',
          country: address.country.trim() || 'NP',
          province: address.province.trim(),
          district: address.district.trim(),
          city: address.city.trim(),
          municipality: address.municipality.trim(),
          ward: address.ward.trim(),
          streetAddress: address.street.trim(),
          postalCode: address.postalCode.trim(),
        }),
      });
      onSaved(updated);
      setMsg('Profile saved');
      setTimeout(onBack, 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={es.screen} edges={['top']}>
      <View style={es.topBar}>
        <Pressable onPress={onBack} hitSlop={12} style={es.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={es.topTitle}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScroll
        contentContainerStyle={es.pad}
        bottomExtra={140}
        avoidOffset={Platform.OS === 'ios' ? 8 : 0}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
          <Text style={es.hint}>Update your personal details. Email stays linked to login.</Text>

          <View style={es.card}>
            <Text style={es.section}>Account</Text>
            <View style={es.field}>
              <Text style={es.label}>Email</Text>
              <View style={es.readonly}>
                <Text style={es.readonlyText}>{initial?.email || session.user.email}</Text>
              </View>
            </View>
            <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="98xxxxxxxx"
              keyboard="phone-pad"
            />
            <Field
              label="Alternate phone"
              value={alternatePhone}
              onChange={setAlternatePhone}
              placeholder="Optional"
              keyboard="phone-pad"
            />
          </View>

          <View style={es.card}>
            <Text style={es.section}>Personal</Text>
            <Field
              label="Birthday"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              keyboard="default"
              autoCapitalize="none"
            />
            <Text style={[es.label, { marginBottom: 8 }]}>Gender</Text>
            <View style={es.chips}>
              {GENDERS.map((g) => {
                const on = gender === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => setGender(on ? '' : g.value)}
                    style={[es.chip, on && es.chipOn]}
                  >
                    <Text style={[es.chipText, on && es.chipTextOn]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={es.card}>
            <Text style={es.section}>Address</Text>
            <AddressPicker value={address} onChange={setAddress} />
          </View>

          {!!error && <Text style={es.error}>{error}</Text>}
          {!!msg && <Text style={es.ok}>{msg}</Text>}

          <PrimaryButton
            label={busy ? 'Saving…' : 'Save changes'}
            onPress={() => void save()}
            disabled={busy}
          />
          {busy && <ActivityIndicator color={colors.coral} style={{ marginTop: 12 }} />}
          <View style={{ height: 40 }} />
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const es = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF6F5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  pad: { paddingHorizontal: 20, paddingBottom: 120 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 14, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.05)',
    overflow: 'visible',
    zIndex: 1,
  },
  section: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 10,
  },
  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  readonly: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F4F1F0',
  },
  readonlyText: { fontSize: 15, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF0F1',
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.coral },
  chipTextOn: { color: colors.white },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 10, fontSize: 13 },
  ok: { color: '#047857', fontWeight: '700', marginBottom: 10, fontSize: 13 },
});
