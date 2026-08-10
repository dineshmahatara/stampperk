import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PHONE_DIAL_OPTIONS,
  isValidEmailFormat,
  isValidPhoneFormat,
  normalizeDialPhone,
  phoneNationalLength,
  sanitizeLocalPhoneInput,
} from '@stampz/shared';
import { api } from '../api';
import { colors, radii } from '../theme';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';

export type AssistMode = 'phone' | 'email' | 'add';
type InviteChannel = 'phone' | 'email';

type FoundCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  qrToken: string;
  qrPayload?: string;
};

type DialOpt = (typeof PHONE_DIAL_OPTIONS)[number];

export function ScanCustomerAssist({
  visible,
  initialMode,
  token,
  onClose,
  onReadyToStamp,
}: {
  visible: boolean;
  initialMode: AssistMode;
  token: string;
  onClose: () => void;
  onReadyToStamp: (customer: FoundCustomer) => void;
}) {
  const [mode, setMode] = useState<AssistMode>(initialMode);
  const [inviteChannel, setInviteChannel] = useState<InviteChannel>('phone');
  const [dial, setDial] = useState<DialOpt>(PHONE_DIAL_OPTIONS[0]);
  const [dialOpen, setDialOpen] = useState(false);
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState<FoundCustomer | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode(initialMode);
    setInviteChannel(initialMode === 'email' ? 'email' : 'phone');
    setLocalPhone('');
    setEmail('');
    setName('');
    setError('');
    setFound(null);
    setNotFound(false);
    setDial(PHONE_DIAL_OPTIONS[0]);
  }, [visible, initialMode]);

  const title =
    mode === 'add'
      ? 'Invite customer'
      : mode === 'email'
        ? 'Find by email address'
        : 'Find by phone number';

  const canSearch = useMemo(() => {
    if (mode === 'email') return isValidEmailFormat(email);
    if (mode === 'phone') return isValidPhoneFormat(localPhone, dial.code);
    return false;
  }, [mode, email, localPhone, dial.code]);

  const canInvite = useMemo(() => {
    if (inviteChannel === 'email') return isValidEmailFormat(email);
    return isValidPhoneFormat(localPhone, dial.code);
  }, [inviteChannel, email, localPhone, dial.code]);

  function setLocalPhoneClamped(value: string, country = dial.code) {
    setLocalPhone(sanitizeLocalPhoneInput(value, country));
  }

  async function search() {
    if (mode === 'phone' && !isValidPhoneFormat(localPhone, dial.code)) {
      setError(`Enter a complete phone number (${phoneLengthHint(dial.code)})`);
      return;
    }
    if (mode === 'email' && !isValidEmailFormat(email)) {
      setError('Enter a valid email address');
      return;
    }
    setBusy(true);
    setError('');
    setFound(null);
    setNotFound(false);
    try {
      const qs =
        mode === 'email'
          ? `email=${encodeURIComponent(email.trim().toLowerCase())}`
          : `phone=${encodeURIComponent(normalizeDialPhone(dial.dial, localPhone))}`;
      const res = await api<{ found: boolean; customer: FoundCustomer | null }>(
        `/merchants/me/customers/lookup?${qs}`,
        { token },
      );
      if (res.found && res.customer) {
        setFound(res.customer);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (inviteChannel === 'phone' && !isValidPhoneFormat(localPhone, dial.code)) {
      setError(`Enter a complete phone number (${phoneLengthHint(dial.code)})`);
      return;
    }
    if (inviteChannel === 'email' && !isValidEmailFormat(email)) {
      setError('Enter a valid email address');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body =
        inviteChannel === 'email'
          ? { email: email.trim().toLowerCase(), name: name.trim() || undefined }
          : {
              phone: normalizeDialPhone(dial.dial, localPhone),
              countryCode: dial.code,
              name: name.trim() || undefined,
            };
      const res = await api<{ created: boolean; customer: FoundCustomer }>(
        '/merchants/me/customers/invite',
        { method: 'POST', token, body: JSON.stringify(body) },
      );
      onReadyToStamp(res.customer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add customer');
    } finally {
      setBusy(false);
    }
  }

  function quickSetup() {
    setName('');
    setLocalPhone('9876543210');
    setEmail('customer@stampz.app');
    setInviteChannel('phone');
  }

  function MethodCard({
    id,
    icon,
    label,
    sub,
    active,
    onPress,
  }: {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    active: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable key={id} onPress={onPress} style={[s.methodCard, active && s.methodCardOn]}>
        {active && (
          <View style={s.checkBadge}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
        <View style={s.methodIcon}>
          <Ionicons name={icon} size={20} color={colors.coral} />
        </View>
        <Text style={s.methodLabel}>{label}</Text>
        <Text style={s.methodSub}>{sub}</Text>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.topBar}>
          <Pressable onPress={onClose} hitSlop={12} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.coral} />
          </Pressable>
          <Text style={s.topTitle}>{title}</Text>
          <View style={s.iconBtn} />
        </View>

        <KeyboardAwareScroll contentContainerStyle={s.pad} bottomExtra={40}>
          <View style={s.sectionHead}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
            <Text style={s.sectionTitle}>{title}</Text>
            {mode === 'add' && (
              <Pressable onPress={quickSetup} style={s.quick}>
                <Ionicons name="flash" size={14} color={colors.coral} />
                <Text style={s.quickText}>Quick setup</Text>
              </Pressable>
            )}
          </View>

          {mode === 'add' && (
            <View style={s.inviteHero}>
              <View style={s.inviteHeroIcon}>
                <Ionicons name="person-add" size={22} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inviteHeroTitle}>Add a new customer</Text>
                <Text style={s.inviteHeroSub}>
                  They can start earning before downloading the app.
                </Text>
              </View>
            </View>
          )}

          {mode !== 'add' && (
            <>
              <Text style={s.hint}>
                {mode === 'phone'
                  ? "Select the customer's phone country, then enter their complete local number."
                  : "Enter the customer email address to find their loyalty cards."}
              </Text>

              {mode === 'phone' ? (
                <PhoneField
                  dial={dial}
                  localPhone={localPhone}
                  onOpenDial={() => setDialOpen(true)}
                  onChangeLocal={setLocalPhoneClamped}
                  label="Phone number"
                  helper={`Enter ${phoneLengthHint(dial.code)} (local number, no country code).`}
                />
              ) : (
                <IconField
                  icon="mail-outline"
                  label="Email address"
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter customer email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}

              <View style={s.methodRow}>
                <MethodCard
                  id="phone"
                  icon="call-outline"
                  label="Phone number"
                  sub="Search by phone"
                  active={mode === 'phone'}
                  onPress={() => {
                    setMode('phone');
                    setFound(null);
                    setNotFound(false);
                    setError('');
                  }}
                />
                <MethodCard
                  id="email"
                  icon="mail-outline"
                  label="Email address"
                  sub="Search by email"
                  active={mode === 'email'}
                  onPress={() => {
                    setMode('email');
                    setFound(null);
                    setNotFound(false);
                    setError('');
                  }}
                />
                <MethodCard
                  id="add"
                  icon="person-add-outline"
                  label="Add customer"
                  sub="Create if not found"
                  active={false}
                  onPress={() => {
                    setMode('add');
                    setInviteChannel(mode === 'email' ? 'email' : 'phone');
                    setFound(null);
                    setNotFound(false);
                    setError('');
                  }}
                />
              </View>

              {!!found && (
                <View style={s.resultCard}>
                  <Text style={s.resultName}>{found.name}</Text>
                  <Text style={s.resultMeta}>{found.email}</Text>
                  {!!found.phone && <Text style={s.resultMeta}>{found.phone}</Text>}
                  <Text style={s.resultId}>Member ID · {found.qrToken}</Text>
                  <Pressable
                    style={s.primaryBtn}
                    onPress={() => onReadyToStamp(found)}
                    disabled={busy}
                  >
                    <Text style={s.primaryText}>Give stamp</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </Pressable>
                </View>
              )}

              {notFound && (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.coral} />
                  <Text style={s.infoText}>
                    No customer found. Tap Add customer to invite them.
                  </Text>
                </View>
              )}

              {!found && (
                <Pressable
                  style={[s.primaryBtn, (!canSearch || busy) && s.primaryDisabled]}
                  onPress={search}
                  disabled={!canSearch || busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={18} color="#fff" />
                      <Text style={s.primaryText}>Search customer</Text>
                    </>
                  )}
                </Pressable>
              )}

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
                <Text style={s.infoText}>
                  {mode === 'phone'
                    ? 'Select the phone country and enter the complete local number, including its area code.'
                    : 'Search uses the email address exactly as the customer entered it.'}
                </Text>
              </View>
            </>
          )}

          {mode === 'add' && (
            <>
              <View style={s.toggleTrack}>
                <Pressable
                  style={[s.toggleOpt, inviteChannel === 'phone' && s.toggleOptOn]}
                  onPress={() => setInviteChannel('phone')}
                >
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={inviteChannel === 'phone' ? '#fff' : colors.coral}
                  />
                  <Text style={[s.toggleText, inviteChannel === 'phone' && s.toggleTextOn]}>
                    Phone
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.toggleOpt, inviteChannel === 'email' && s.toggleOptOn]}
                  onPress={() => setInviteChannel('email')}
                >
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color={inviteChannel === 'email' ? '#fff' : colors.coral}
                  />
                  <Text style={[s.toggleText, inviteChannel === 'email' && s.toggleTextOn]}>
                    Email
                  </Text>
                </Pressable>
              </View>

              <Text style={s.formTitle}>
                {inviteChannel === 'phone' ? 'Add Customer by Number' : 'Add Customer by Email'}
              </Text>
              <Text style={s.hint}>
                {inviteChannel === 'phone'
                  ? "Create a pending account using the customer's phone number."
                  : "Create or match the customer's account using their real email."}
              </Text>

              <IconField
                icon="person-outline"
                label="Customer name (optional)"
                value={name}
                onChange={setName}
                placeholder="Generated automatically if left empty."
              />

              {inviteChannel === 'phone' ? (
                <>
                  <PhoneField
                    dial={dial}
                    localPhone={localPhone}
                    onOpenDial={() => setDialOpen(true)}
                    onChangeLocal={setLocalPhoneClamped}
                    label="Phone number"
                    helper={`Enter ${phoneLengthHint(dial.code)}.`}
                  />
                  <Text style={s.fieldHelp}>
                    The country and complete local number create one exact international phone
                    identity.
                  </Text>
                </>
              ) : (
                <IconField
                  icon="mail-outline"
                  label="Email address"
                  value={email}
                  onChange={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}

              <Pressable
                style={[s.primaryBtn, (!canInvite || busy) && s.primaryDisabled]}
                onPress={invite}
                disabled={!canInvite || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={s.primaryText}>Add Customer & Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </>
          )}

          {!!error && <Text style={s.error}>{error}</Text>}
        </KeyboardAwareScroll>

        <Modal visible={dialOpen} transparent animationType="fade" onRequestClose={() => setDialOpen(false)}>
          <Pressable style={s.dialBg} onPress={() => setDialOpen(false)}>
            <View style={s.dialSheet}>
              <Text style={s.formTitle}>Country code</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {PHONE_DIAL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.code}
                    style={s.dialRow}
                    onPress={() => {
                      setDial(opt);
                      setLocalPhoneClamped(localPhone, opt.code);
                      setDialOpen(false);
                    }}
                  >
                    <Text style={s.dialFlag}>{opt.flag}</Text>
                    <Text style={s.dialLabel}>
                      {opt.code} {opt.dial}
                    </Text>
                    <Text style={s.dialCountry}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function phoneLengthHint(countryCode: string): string {
  const { min, max } = phoneNationalLength(countryCode);
  return min === max ? `${max} digits` : `${min}–${max} digits`;
}

function PhoneField({
  dial,
  localPhone,
  onOpenDial,
  onChangeLocal,
  label,
  helper,
}: {
  dial: DialOpt;
  localPhone: string;
  onOpenDial: () => void;
  onChangeLocal: (v: string) => void;
  label: string;
  helper: string;
}) {
  const { max } = phoneNationalLength(dial.code);
  const digits = localPhone.replace(/\D/g, '').length;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldHelp}>{helper}</Text>
      <View style={s.phoneRow}>
        <Pressable style={s.dialBtn} onPress={onOpenDial}>
          <Text style={s.dialFlag}>{dial.flag}</Text>
          <Text style={s.dialCodeText}>
            {dial.code} {dial.dial}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
        <TextInput
          style={s.phoneInput}
          value={localPhone}
          onChangeText={onChangeLocal}
          keyboardType="number-pad"
          maxLength={max}
          placeholder={dial.code === 'NP' ? '98xxxxxxxx' : 'Local number'}
          placeholderTextColor={colors.muted}
        />
        <Text style={s.digitCount}>
          {digits}/{max}
        </Text>
      </View>
    </View>
  );
}

function IconField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.iconInputRow}>
        <Ionicons name={icon} size={18} color={colors.coral} />
        <TextInput
          style={s.iconInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF7F7' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  pad: { padding: 16, paddingBottom: 40 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.ink },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickText: { color: colors.coral, fontWeight: '700', fontSize: 13 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 14 },
  fieldLabel: { fontWeight: '800', color: colors.ink, marginBottom: 2 },
  fieldHelp: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  dialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
  },
  dialFlag: { fontSize: 16 },
  dialCodeText: { fontWeight: '700', fontSize: 12, color: colors.ink },
  phoneInput: { flex: 1, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 12 : 8, color: colors.ink, fontWeight: '600' },
  digitCount: {
    marginRight: 10,
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    minWidth: 36,
    textAlign: 'right',
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  iconInput: { flex: 1, color: colors.ink, fontWeight: '600', paddingVertical: 8 },
  methodRow: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  methodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    alignItems: 'center',
    minHeight: 110,
  },
  methodCardOn: { borderColor: colors.coral, backgroundColor: '#FFF5F6' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodLabel: { fontWeight: '800', fontSize: 12, color: colors.ink, textAlign: 'center' },
  methodSub: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 2 },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  infoBox: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  infoText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.pinkDeep,
    marginBottom: 8,
  },
  resultName: { fontWeight: '800', fontSize: 18, color: colors.ink },
  resultMeta: { color: colors.muted, marginTop: 2 },
  resultId: { color: colors.coral, fontWeight: '800', marginTop: 8, letterSpacing: 1 },
  inviteHero: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
    alignItems: 'center',
  },
  inviteHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteHeroTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  inviteHeroSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: colors.pink,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  toggleOpt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
  },
  toggleOptOn: { backgroundColor: colors.coral },
  toggleText: { fontWeight: '800', color: colors.coral, fontSize: 14 },
  toggleTextOn: { color: '#fff' },
  formTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  error: { color: '#DC2626', fontWeight: '700', marginTop: 12 },
  dialBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  dialSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dialLabel: { fontWeight: '800', color: colors.ink },
  dialCountry: { marginLeft: 'auto', color: colors.muted, fontSize: 12 },
});
