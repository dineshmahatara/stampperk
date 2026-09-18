import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { BUSINESS_INDUSTRIES, BUSINESS_TYPES, normalizeCountryCode, contactFormatError, type AddressFormValue } from '@stampperk/shared';
import { api } from '../api';
import { colors, styles as theme } from '../theme';
import { Card, PrimaryButton } from '../ui';
import { LogoPicker } from '../components/LogoPicker';
import { MapLocationPicker, googleMapsLink } from '../components/MapLocationPicker';
import { AddressPicker } from '../components/AddressPicker';

type Merchant = Record<string, unknown> & {
  id?: string;
  businessName?: string;
  slug?: string;
  logoUrl?: string | null;
  category?: string;
  publicLinks?: { id: string; label: string; url: string }[];
};

function filled(...vals: unknown[]) {
  return vals.some((v) => v != null && String(v).trim() !== '' && v !== false);
}

export function profileSections(m: Merchant | null) {
  if (!m) {
    return [
      { id: 'basic', label: 'Basic info', done: false },
      { id: 'brand', label: 'Logo & brand', done: false },
      { id: 'contact', label: 'Contact', done: false },
      { id: 'location', label: 'Location', done: false },
      { id: 'social', label: 'Social links', done: false },
    ];
  }
  return [
    {
      id: 'basic',
      label: 'Basic info',
      done: filled(m.businessName) && filled(m.category) && filled(m.description || m.tagline),
    },
    {
      id: 'brand',
      label: 'Logo & brand',
      done: filled(m.logoUrl) && filled(m.tagline),
    },
    {
      id: 'contact',
      label: 'Contact',
      done: filled(m.phone || m.mobile) && filled(m.email || m.contactPerson),
    },
    {
      id: 'location',
      label: 'Location',
      done: filled(m.city) && filled(m.address || m.district) && filled(m.latitude) && filled(m.longitude),
    },
    {
      id: 'social',
      label: 'Social links',
      done: filled(m.facebook, m.instagram, m.tiktok, m.website, m.whatsapp),
    },
  ];
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={theme.sectionLabel}>{label}</Text>
      <TextInput
        style={[theme.input, multiline && { minHeight: 88, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function ChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={theme.sectionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[s.chip, value === opt && s.chipOn]}
          >
            <Text style={value === opt ? s.chipTextOn : s.chipText}>{opt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, done }: { title: string; done: boolean }) {
  return (
    <View style={s.sectionHead}>
      <View style={[s.tick, done && s.tickOn]}>
        <Text style={[s.tickMark, done && { color: '#fff' }]}>{done ? '✓' : ''}</Text>
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={[s.sectionStatus, done && { color: '#059669' }]}>
        {done ? 'Complete' : 'Incomplete'}
      </Text>
    </View>
  );
}

export function MerchantBusinessProfile({
  token,
  canEdit,
  merchantKey,
}: {
  token: string;
  canEdit: boolean;
  merchantKey?: number;
}) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const load = useCallback(() => {
    api<Merchant>('/merchants/me', { token })
      .then(setMerchant)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [token]);

  useEffect(() => {
    load();
  }, [load, merchantKey]);

  const sections = useMemo(() => profileSections(merchant), [merchant]);
  const doneCount = sections.filter((s) => s.done).length;
  const allDone = doneCount === sections.length;

  function setField(key: string, value: unknown) {
    setMerchant((m) => (m ? { ...m, [key]: value } : m));
  }

  function str(key: string) {
    const v = merchant?.[key];
    return v == null ? '' : String(v);
  }

  async function save() {
    if (!merchant || !canEdit) return;
    const contactErr = contactFormatError({
      email: str('email'),
      phone: str('phone'),
      mobile: str('mobile'),
      whatsapp: str('whatsapp'),
      supportPhone: str('supportPhone'),
      countryCode: str('country') || 'NP',
    });
    if (contactErr) {
      setError(contactErr);
      setMsg('');
      return;
    }
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const yearRaw = str('yearEstablished').trim();
      await api('/merchants/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          businessName: merchant.businessName,
          logoUrl: merchant.logoUrl || '',
          registrationNumber: merchant.registrationNumber || '',
          panVatNumber: merchant.panVatNumber || '',
          businessType: merchant.businessType || '',
          category: merchant.category,
          yearEstablished: yearRaw ? Number(yearRaw) : null,
          description: merchant.description || '',
          tagline: merchant.tagline || '',
          contactPerson: merchant.contactPerson || '',
          designation: merchant.designation || '',
          email: merchant.email || '',
          phone: merchant.phone || '',
          mobile: merchant.mobile || '',
          website: merchant.website || '',
          supportPhone: merchant.supportPhone || '',
          whatsapp: merchant.whatsapp || '',
          country: merchant.country || 'NP',
          province: merchant.province || '',
          district: merchant.district || '',
          city: merchant.city || '',
          municipality: merchant.municipality || '',
          ward: merchant.ward || '',
          address: merchant.address || '',
          postalCode: merchant.postalCode || '',
          googleMapsUrl:
            merchant.googleMapsUrl ||
            (typeof merchant.latitude === 'number' && typeof merchant.longitude === 'number'
              ? googleMapsLink(merchant.latitude, merchant.longitude)
              : ''),
          latitude: typeof merchant.latitude === 'number' ? merchant.latitude : null,
          longitude: typeof merchant.longitude === 'number' ? merchant.longitude : null,
          facebook: merchant.facebook || '',
          instagram: merchant.instagram || '',
          linkedin: merchant.linkedin || '',
          tiktok: merchant.tiktok || '',
          youtube: merchant.youtube || '',
          twitter: merchant.twitter || '',
          deliveryEnabled: Boolean(merchant.deliveryEnabled),
          deliveryNote: merchant.deliveryNote || '',
          supportNote: merchant.supportNote || '',
        }),
      });
      setMsg('Business profile saved');
      setEditing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function addLink() {
    if (!linkLabel.trim() || !linkUrl.trim()) {
      setError('Link label and URL required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/merchants/me/links', {
        method: 'POST',
        token,
        body: JSON.stringify({ label: linkLabel.trim(), url: linkUrl.trim() }),
      });
      setLinkLabel('');
      setLinkUrl('');
      setMsg('Link added');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add link');
    } finally {
      setBusy(false);
    }
  }

  if (!merchant) {
    return (
      <Card>
        <ActivityIndicator color={colors.coral} />
        <Text style={[theme.muted, { marginTop: 8 }]}>Loading business profile…</Text>
        {!!error && <Text style={s.error}>{error}</Text>}
      </Card>
    );
  }

  return (
    <View>
      <Text style={theme.sectionLabel}>Business profile</Text>

      <Card style={{ backgroundColor: allDone ? '#ECFDF5' : colors.pink, borderColor: allDone ? '#A7F3D0' : colors.pinkDeep }}>
        <Text style={s.progressTitle}>
          {allDone ? 'Profile complete' : `Profile ${doneCount}/${sections.length} complete`}
        </Text>
        <Text style={[theme.muted, { marginBottom: 10 }]}>
          Stamp card back uses contact, social, and location from here.
        </Text>
        {sections.map((sec) => (
          <View key={sec.id} style={s.checkRow}>
            <View style={[s.tick, sec.done && s.tickOn]}>
              <Text style={[s.tickMark, sec.done && { color: '#fff' }]}>{sec.done ? '✓' : ''}</Text>
            </View>
            <Text style={[s.checkLabel, sec.done && { color: colors.ink }]}>{sec.label}</Text>
          </View>
        ))}
        {canEdit && !editing && (
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label={allDone ? 'Edit profile' : 'Complete profile'}
              onPress={() => setEditing(true)}
            />
          </View>
        )}
      </Card>

      {!!msg && <Text style={theme.badge}>{msg}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}

      {editing && canEdit && (
        <View style={{ marginTop: 8 }}>
          <SectionHeader title="Basic info" done={sections.find((x) => x.id === 'basic')!.done} />
          <Card>
            <Field label="Business name" value={str('businessName')} onChange={(v) => setField('businessName', v)} />
            <ChipSelect
              label="Industry"
              options={BUSINESS_INDUSTRIES}
              value={str('category')}
              onChange={(v) => setField('category', v)}
            />
            <ChipSelect
              label="Business type"
              options={BUSINESS_TYPES}
              value={str('businessType')}
              onChange={(v) => setField('businessType', v)}
            />
            <Field label="Registration number" value={str('registrationNumber')} onChange={(v) => setField('registrationNumber', v)} />
            <Field label="PAN / VAT" value={str('panVatNumber')} onChange={(v) => setField('panVatNumber', v)} />
            <Field
              label="Year established"
              value={str('yearEstablished')}
              onChange={(v) => setField('yearEstablished', v)}
              keyboardType="numeric"
              placeholder="2019"
            />
            <Field label="Tagline" value={str('tagline')} onChange={(v) => setField('tagline', v)} placeholder="Short slogan" />
            <Field
              label="Description"
              value={str('description')}
              onChange={(v) => setField('description', v)}
              multiline
            />
          </Card>

          <SectionHeader title="Logo & brand" done={sections.find((x) => x.id === 'brand')!.done} />
          <Card>
            <Text style={theme.sectionLabel}>Logo</Text>
            <LogoPicker
              token={token}
              value={str('logoUrl')}
              onChange={(url) => setField('logoUrl', url)}
            />
          </Card>

          <SectionHeader title="Contact" done={sections.find((x) => x.id === 'contact')!.done} />
          <Card>
            <Field label="Contact person" value={str('contactPerson')} onChange={(v) => setField('contactPerson', v)} />
            <Field label="Designation" value={str('designation')} onChange={(v) => setField('designation', v)} />
            <Field label="Email" value={str('email')} onChange={(v) => setField('email', v)} keyboardType="email-address" />
            <Field label="Phone" value={str('phone')} onChange={(v) => setField('phone', v)} keyboardType="phone-pad" />
            <Field label="Mobile" value={str('mobile')} onChange={(v) => setField('mobile', v)} keyboardType="phone-pad" />
            <Field label="WhatsApp" value={str('whatsapp')} onChange={(v) => setField('whatsapp', v)} keyboardType="phone-pad" />
            <Field label="Website" value={str('website')} onChange={(v) => setField('website', v)} keyboardType="url" />
            <Field label="Support phone" value={str('supportPhone')} onChange={(v) => setField('supportPhone', v)} keyboardType="phone-pad" />
          </Card>

          <SectionHeader title="Location" done={sections.find((x) => x.id === 'location')!.done} />
          <Card>
            <AddressPicker
              streetLabel="Street address"
              value={{
                country: normalizeCountryCode(str('country')) || 'NP',
                province: str('province'),
                district: str('district'),
                city: str('city'),
                municipality: str('municipality'),
                ward: str('ward'),
                street: str('address'),
                postalCode: str('postalCode'),
              }}
              onChange={(next: AddressFormValue) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        country: next.country,
                        province: next.province,
                        district: next.district,
                        city: next.city,
                        municipality: next.municipality,
                        ward: next.ward,
                        address: next.street,
                        postalCode: next.postalCode,
                      }
                    : m,
                );
              }}
              onCoords={({ latitude, longitude }) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        latitude,
                        longitude,
                        googleMapsUrl: googleMapsLink(latitude, longitude) || String(m.googleMapsUrl || ''),
                      }
                    : m,
                );
              }}
            />
            <Text style={[theme.sectionLabel, { marginTop: 8 }]}>Exact map location</Text>
            <MapLocationPicker
              latitude={typeof merchant.latitude === 'number' ? merchant.latitude : null}
              longitude={typeof merchant.longitude === 'number' ? merchant.longitude : null}
              onChange={(v) => {
                setMerchant((m) =>
                  m
                    ? {
                        ...m,
                        latitude: v.latitude,
                        longitude: v.longitude,
                        googleMapsUrl: v.googleMapsUrl || m.googleMapsUrl || '',
                      }
                    : m,
                );
              }}
            />
            <Field
              label="Google Maps URL"
              value={str('googleMapsUrl')}
              onChange={(v) => setField('googleMapsUrl', v)}
              keyboardType="url"
            />
          </Card>

          <SectionHeader title="Social links" done={sections.find((x) => x.id === 'social')!.done} />
          <Card>
            <Field label="Facebook" value={str('facebook')} onChange={(v) => setField('facebook', v)} keyboardType="url" />
            <Field label="Instagram" value={str('instagram')} onChange={(v) => setField('instagram', v)} keyboardType="url" />
            <Field label="TikTok" value={str('tiktok')} onChange={(v) => setField('tiktok', v)} keyboardType="url" />
            <Field label="LinkedIn" value={str('linkedin')} onChange={(v) => setField('linkedin', v)} keyboardType="url" />
            <Field label="YouTube" value={str('youtube')} onChange={(v) => setField('youtube', v)} keyboardType="url" />
            <Field label="Twitter / X" value={str('twitter')} onChange={(v) => setField('twitter', v)} keyboardType="url" />
          </Card>

          <Text style={theme.sectionLabel}>Extras</Text>
          <Card>
            <Pressable
              onPress={() => setField('deliveryEnabled', !merchant.deliveryEnabled)}
              style={[s.toggle, merchant.deliveryEnabled && s.toggleOn]}
            >
              <Text style={s.toggleText}>
                {merchant.deliveryEnabled ? '✓ Delivery available' : 'Delivery available'}
              </Text>
            </Pressable>
            <Field label="Delivery note" value={str('deliveryNote')} onChange={(v) => setField('deliveryNote', v)} multiline />
            <Field label="Support note" value={str('supportNote')} onChange={(v) => setField('supportNote', v)} multiline />
          </Card>

          <Text style={theme.sectionLabel}>Public links</Text>
          <Card>
            {(merchant.publicLinks || []).map((l) => (
              <View key={l.id} style={s.linkRow}>
                <Text style={s.linkTitle}>{l.label}</Text>
                <Text style={theme.muted} numberOfLines={1}>
                  {l.url}
                </Text>
              </View>
            ))}
            <Field label="New link label" value={linkLabel} onChange={setLinkLabel} placeholder="Menu" />
            <Field label="URL" value={linkUrl} onChange={setLinkUrl} keyboardType="url" placeholder="https://" />
            <PrimaryButton label="Add link" outline onPress={addLink} disabled={busy} />
          </Card>

          <PrimaryButton label={busy ? 'Saving…' : 'Save profile'} onPress={save} disabled={busy} />
          <PrimaryButton
            label="Cancel"
            outline
            onPress={() => {
              setEditing(false);
              setError('');
              load();
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  progressTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  checkLabel: { fontWeight: '700', color: colors.muted, fontSize: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: { flex: 1, fontWeight: '800', fontSize: 15, color: colors.ink },
  sectionStatus: { fontSize: 11, fontWeight: '700', color: colors.muted },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tickOn: { backgroundColor: '#059669', borderColor: '#059669' },
  tickMark: { fontSize: 12, fontWeight: '900', color: 'transparent' },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.pink,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: colors.coral },
  chipText: { fontWeight: '700', color: colors.ink, fontSize: 12 },
  chipTextOn: { fontWeight: '700', color: '#fff', fontSize: 12 },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 8 },
  toggle: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F4F5F7',
  },
  toggleOn: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  toggleText: { fontWeight: '800', color: colors.ink },
  linkRow: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  linkTitle: { fontWeight: '800', color: colors.ink },
});
