import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUSINESS_INDUSTRIES, merchantEssentialsReady, contactFormatError, phoneNationalLength, sanitizeLocalPhoneInput } from '@stampperk/shared';
import { api } from '../api';
import { colors, styles as theme } from '../theme';
import { PrimaryButton, ScreenHeader } from '../ui';
import { LogoPicker } from './LogoPicker';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';

export type EssentialsMerchant = {
  id?: string;
  businessName?: string;
  category?: string;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  address?: string | null;
  tagline?: string | null;
  description?: string | null;
  country?: string | null;
};

export function MerchantEssentialsSetup({
  token,
  initial,
  onSaved,
  onCancel,
}: {
  token: string;
  initial?: EssentialsMerchant | null;
  onSaved: (merchant: EssentialsMerchant) => void;
  onCancel?: () => void;
}) {
  const [businessName, setBusinessName] = useState(initial?.businessName || '');
  const [category, setCategory] = useState(initial?.category || BUSINESS_INDUSTRIES[0]);
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl || '');
  const [phone, setPhone] = useState(initial?.phone || initial?.mobile || '');
  const [city, setCity] = useState(initial?.city || 'Kathmandu');
  const [address, setAddress] = useState(initial?.address || '');
  const [tagline, setTagline] = useState(initial?.tagline || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const draft = { businessName, category, logoUrl, phone, city };
    if (!merchantEssentialsReady(draft)) {
      setError('Name, category, logo, phone, and city are required');
      return;
    }
    const contactErr = contactFormatError({
      phone,
      countryCode: initial?.country || 'NP',
      requirePhone: true,
    });
    if (contactErr) {
      setError(contactErr);
      return;
    }
    setBusy(true);
    setError('');
    try {
      let merchant: EssentialsMerchant;
      if (initial?.id) {
        merchant = await api<EssentialsMerchant>('/merchants/me', {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            businessName: businessName.trim(),
            category,
            logoUrl,
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim() || '',
            tagline: tagline.trim() || '',
            description: description.trim() || '',
            country: initial.country || 'NP',
          }),
        });
      } else {
        merchant = await api<EssentialsMerchant>('/merchants', {
          method: 'POST',
          token,
          body: JSON.stringify({
            businessName: businessName.trim(),
            category,
            logoUrl,
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim() || undefined,
            description: description.trim() || undefined,
            country: 'NP',
          }),
        });
        if (tagline.trim() || address.trim() || description.trim()) {
          merchant = await api<EssentialsMerchant>('/merchants/me', {
            method: 'PATCH',
            token,
            body: JSON.stringify({
              tagline: tagline.trim() || '',
              address: address.trim() || '',
              description: description.trim() || '',
            }),
          });
        }
      }
      onSaved(merchant);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={theme.screen} edges={['top', 'bottom']}>
      <KeyboardAwareScroll contentContainerStyle={theme.pad} bottomExtra={100}>
        <ScreenHeader
          title="Business profile"
          subtitle="Step 1 of 2 — customers see this before your stamp card"
        />
        {!!onCancel && (
          <Pressable onPress={onCancel} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.coral, fontWeight: '700' }}>← Back</Text>
          </Pressable>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}

        <Text style={theme.sectionLabel}>Business name *</Text>
        <TextInput
          style={theme.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Bean & Bloom Cafe"
        />

        <Text style={theme.sectionLabel}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {BUSINESS_INDUSTRIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[s.chip, category === c && s.chipOn]}
            >
              <Text style={category === c ? s.chipTextOn : s.chipText}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={theme.sectionLabel}>Logo *</Text>
        <LogoPicker token={token} value={logoUrl || undefined} onChange={setLogoUrl} />

        <Text style={theme.sectionLabel}>Phone *</Text>
        <TextInput
          style={theme.input}
          value={phone}
          onChangeText={(v) => setPhone(sanitizeLocalPhoneInput(v, 'NP'))}
          keyboardType="number-pad"
          maxLength={phoneNationalLength('NP').max}
          placeholder="98xxxxxxxx"
        />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: -4 }}>
          Nepal: {phoneNationalLength('NP').max} digits max
        </Text>

        <Text style={theme.sectionLabel}>City *</Text>
        <TextInput style={theme.input} value={city} onChangeText={setCity} placeholder="Kathmandu" />

        <Text style={theme.sectionLabel}>Street address</Text>
        <TextInput
          style={theme.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Optional — helps customers find you"
        />

        <Text style={theme.sectionLabel}>Tagline</Text>
        <TextInput
          style={theme.input}
          value={tagline}
          onChangeText={setTagline}
          placeholder="Optional short slogan"
          maxLength={120}
        />

        <Text style={theme.sectionLabel}>Short description</Text>
        <TextInput
          style={[theme.input, { minHeight: 88, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          multiline
        />

        <PrimaryButton
          label={busy ? 'Saving…' : 'Continue to stamp card →'}
          onPress={save}
          disabled={busy}
          arrow={!busy}
        />
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.pink,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.coral },
  chipText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
