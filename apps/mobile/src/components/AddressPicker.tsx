import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AddressFormValue,
  AddressOption,
  filterOptions,
  isNepalCountry,
  listCities,
  listCountries,
  listNepalDistricts,
  listNepalLocalLevels,
  listNepalWards,
  listStates,
  mapNominatimToAddress,
  nepalDistrictName,
  nepalLocalLevelName,
  normalizeCountryCode,
  resolveNepalDistrictId,
  resolveNepalLocalLevelId,
  resolveStateCode,
  searchPlaces,
  showsLocalAdminFields,
  stateName,
  type NominatimHit,
} from '@stampperk/shared';
import { colors, radii } from '../theme';

function OptionModal({
  visible,
  title,
  options,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  options: AddressOption[];
  onClose: () => void;
  onPick: (opt: AddressOption) => void;
}) {
  const [q, setQ] = useState('');
  const { height } = useWindowDimensions();
  const filtered = useMemo(() => filterOptions(options, q, 150), [options, q]);
  useEffect(() => {
    if (!visible) setQ('');
  }, [visible]);

  const listMax = Math.min(420, Math.round(height * 0.55));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View style={as.modalBg}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={as.sheetWrap}
        >
          <View style={[as.sheet, { maxHeight: height * 0.88 }]}>
            <View style={as.handle} />
            <Text style={as.sheetTitle}>{title}</Text>
            <TextInput
              style={as.input}
              value={q}
              onChangeText={setQ}
              placeholder="Search…"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.value}-${item.label}`}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: listMax }}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListEmptyComponent={<Text style={as.empty}>No matches</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={as.row}
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                >
                  <Text style={as.rowText}>{item.label}</Text>
                  {!!item.meta && <Text style={as.meta}>{item.meta}</Text>}
                </Pressable>
              )}
            />
            <Pressable onPress={onClose} style={as.cancel}>
              <Text style={as.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SelectRow({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={as.field}>
      <Text style={as.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[as.select, disabled && { opacity: 0.45 }]}
      >
        <Text style={[as.selectText, !value && { color: colors.muted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

type PickerKind = 'country' | 'state' | 'city' | 'district' | 'local' | 'ward';

export function AddressPicker({
  value,
  onChange,
  streetLabel = 'Street address',
  onCoords,
}: {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
  streetLabel?: string;
  onCoords?: (coords: { latitude: number; longitude: number }) => void;
}) {
  const countryCode = normalizeCountryCode(value.country);
  const nepal = isNepalCountry(countryCode);
  const countries = useMemo(() => listCountries(), []);
  const states = useMemo(() => listStates(countryCode), [countryCode]);
  const provinceCode =
    value.provinceCode || resolveStateCode(countryCode, value.province) || '';
  const cities = useMemo(
    () => listCities(countryCode, provinceCode),
    [countryCode, provinceCode],
  );
  const nepalDistricts = useMemo(
    () => (nepal ? listNepalDistricts(provinceCode || value.province) : []),
    [nepal, provinceCode, value.province],
  );
  const districtId = nepal
    ? resolveNepalDistrictId(value.district, provinceCode || value.province)
    : '';
  const nepalLocals = useMemo(
    () =>
      nepal && (districtId || value.district)
        ? listNepalLocalLevels(districtId || value.district)
        : [],
    [nepal, districtId, value.district],
  );
  const localLevelId = nepal
    ? resolveNepalLocalLevelId(value.municipality || value.city, districtId || value.district)
    : '';
  const wards = useMemo(() => (nepal ? listNepalWards(35) : []), [nepal]);
  const local = showsLocalAdminFields(countryCode);

  const [picker, setPicker] = useState<null | PickerKind>(null);
  const [placeQ, setPlaceQ] = useState('');
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (placeQ.trim().length < 3) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchPlaces(placeQ, 6)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 500);
    return () => clearTimeout(t);
  }, [placeQ]);

  function patch(partial: Partial<AddressFormValue>) {
    onChange({ ...value, ...partial });
  }

  function applyHit(hit: NominatimHit) {
    const mapped = mapNominatimToAddress(hit);
    const { latitude, longitude, ...addr } = mapped;
    onChange({
      country: addr.country || value.country,
      province: addr.province || '',
      provinceCode: addr.provinceCode,
      district: addr.district || '',
      city: addr.city || '',
      municipality: addr.municipality || '',
      ward: addr.ward || '',
      street: addr.street || value.street,
      postalCode: addr.postalCode || value.postalCode,
    });
    if (latitude != null && longitude != null) onCoords?.({ latitude, longitude });
    setPlaceQ('');
    setHits([]);
  }

  const countryLabel =
    countries.find((c) => c.value === countryCode)?.label || value.country || '';
  const provinceLabel =
    states.find((s) => s.value === provinceCode)?.label ||
    stateName(countryCode, value.province) ||
    value.province ||
    '';
  const districtLabel = nepal
    ? nepalDistrictName(districtId || value.district, provinceCode) || value.district
    : value.district;
  const localLabel = nepal
    ? nepalLocalLevelName(localLevelId || value.municipality, districtId) ||
      value.municipality ||
      value.city
    : value.municipality;

  const modalOptions: AddressOption[] =
    picker === 'country'
      ? countries
      : picker === 'state'
        ? states
        : picker === 'city'
          ? cities
          : picker === 'district'
            ? nepalDistricts
            : picker === 'local'
              ? nepalLocals
              : picker === 'ward'
                ? wards
                : [];

  const modalTitle =
    picker === 'country'
      ? 'Country'
      : picker === 'state'
        ? nepal
          ? 'Province'
          : 'State / Province'
        : picker === 'city'
          ? 'City'
          : picker === 'district'
            ? 'District'
            : picker === 'local'
              ? 'Local level'
              : picker === 'ward'
                ? 'Ward'
                : '';

  return (
    <View>
      <View style={as.searchBox}>
        <Text style={as.label}>Search address (worldwide)</Text>
        <TextInput
          style={as.input}
          value={placeQ}
          onChangeText={setPlaceQ}
          placeholder="Type place, street, or city…"
          placeholderTextColor={colors.muted}
        />
        {searching && <ActivityIndicator color={colors.coral} style={{ marginTop: 8 }} />}
        {hits.map((h) => (
          <Pressable key={h.display_name} style={as.hit} onPress={() => applyHit(h)}>
            <Ionicons name="location-outline" size={14} color={colors.coral} />
            <Text style={as.hitText}>{h.display_name}</Text>
          </Pressable>
        ))}
        <Text style={as.hint}>
          {nepal
            ? 'Nepal: Province → District → Local level → Ward.'
            : 'Or pick country → state → city from the lists below.'}
        </Text>
      </View>

      <SelectRow
        label="Country"
        value={countryLabel}
        placeholder="Select country"
        onPress={() => setPicker('country')}
      />
      <SelectRow
        label={nepal ? 'Province (प्रदेश)' : 'State / Province'}
        value={provinceLabel}
        placeholder={countryCode ? (nepal ? 'Select province' : 'Select state / province') : 'Select country first'}
        disabled={!countryCode || !states.length}
        onPress={() => setPicker('state')}
      />

      {nepal ? (
        <>
          <SelectRow
            label="District (जिल्ला)"
            value={districtLabel}
            placeholder={provinceCode ? 'Select district' : 'Select province first'}
            disabled={!provinceCode}
            onPress={() => setPicker('district')}
          />
          <SelectRow
            label="Local level (स्थानीय तह)"
            value={localLabel}
            placeholder={
              districtId || value.district ? 'Select local level' : 'Select district first'
            }
            disabled={!districtId && !value.district}
            onPress={() => setPicker('local')}
          />
          <SelectRow
            label="Ward (वडा)"
            value={value.ward ? `Ward ${value.ward}` : ''}
            placeholder="Select ward"
            disabled={!localLevelId && !value.municipality}
            onPress={() => setPicker('ward')}
          />
          <View style={as.field}>
            <Text style={as.label}>Ward (custom)</Text>
            <TextInput
              style={as.input}
              value={value.ward}
              onChangeText={(t) => patch({ ward: t })}
              placeholder="Or type ward number"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </View>
        </>
      ) : (
        <>
          <SelectRow
            label="City (list)"
            value={value.city}
            placeholder={provinceCode ? 'Select city' : 'Select state first'}
            disabled={!provinceCode || !cities.length}
            onPress={() => setPicker('city')}
          />
          <View style={as.field}>
            <Text style={as.label}>City (custom)</Text>
            <TextInput
              style={as.input}
              value={value.city}
              onChangeText={(t) => patch({ city: t })}
              placeholder="Type if not in list"
              placeholderTextColor={colors.muted}
            />
          </View>
          {local && (
            <>
              <View style={as.field}>
                <Text style={as.label}>District / County</Text>
                <TextInput
                  style={as.input}
                  value={value.district}
                  onChangeText={(t) => patch({ district: t })}
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={as.field}>
                <Text style={as.label}>Municipality</Text>
                <TextInput
                  style={as.input}
                  value={value.municipality}
                  onChangeText={(t) => patch({ municipality: t })}
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={as.field}>
                <Text style={as.label}>Ward</Text>
                <TextInput
                  style={as.input}
                  value={value.ward}
                  onChangeText={(t) => patch({ ward: t })}
                  placeholderTextColor={colors.muted}
                />
              </View>
            </>
          )}
        </>
      )}

      <View style={as.field}>
        <Text style={as.label}>{streetLabel}</Text>
        <TextInput
          style={[as.input, { minHeight: 72, textAlignVertical: 'top' }]}
          value={value.street}
          onChangeText={(t) => patch({ street: t })}
          multiline
          placeholder="House / street / landmark"
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={as.field}>
        <Text style={as.label}>Postal code</Text>
        <TextInput
          style={as.input}
          value={value.postalCode}
          onChangeText={(t) => patch({ postalCode: t })}
          placeholderTextColor={colors.muted}
        />
      </View>

      <OptionModal
        visible={picker != null}
        title={modalTitle}
        options={modalOptions}
        onClose={() => setPicker(null)}
        onPick={(opt) => {
          if (picker === 'country') {
            patch({
              country: opt.value,
              province: '',
              provinceCode: '',
              district: '',
              city: '',
              municipality: '',
              ward: '',
            });
          } else if (picker === 'state') {
            patch({
              province: opt.label,
              provinceCode: opt.value,
              district: '',
              city: '',
              municipality: '',
              ward: '',
            });
          } else if (picker === 'city') {
            patch({ city: opt.label });
          } else if (picker === 'district') {
            patch({ district: opt.label, city: '', municipality: '', ward: '' });
          } else if (picker === 'local') {
            patch({ municipality: opt.label, city: opt.label });
          } else if (picker === 'ward') {
            patch({ ward: opt.value });
          }
        }}
      />
    </View>
  );
}

const as = StyleSheet.create({
  searchBox: {
    backgroundColor: '#FFF0F1',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFD6DA',
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
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    backgroundColor: '#FFFBFA',
  },
  select: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFBFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  hint: { marginTop: 8, fontSize: 11, color: colors.muted, lineHeight: 15 },
  hit: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
  },
  hitText: { flex: 1, fontSize: 12.5, color: colors.ink, fontWeight: '600' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowText: { fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1 },
  meta: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  empty: { paddingVertical: 28, textAlign: 'center', color: colors.muted },
  cancel: { marginTop: 8, alignItems: 'center', padding: 12 },
  cancelText: { fontWeight: '800', color: colors.coral },
});
