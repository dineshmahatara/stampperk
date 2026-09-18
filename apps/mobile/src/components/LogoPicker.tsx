import { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { groupMediaLibrary, mediaLibraryGroupLabel } from '@stampperk/shared';
import { api, uploadMedia } from '../api';
import { colors } from '../theme';
import { PrimaryButton } from '../ui';
import { LogoImage, resolveMediaUrl } from './LogoImage';

type LibraryItem = {
  id: string;
  label: string;
  url: string;
  categorySlug?: string;
  categoryGroup: string;
  groupLabel?: string;
};

export function LogoPicker({
  token,
  value,
  categorySlug,
  onChange,
}: {
  token?: string | null;
  value?: string;
  categorySlug?: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const q = categorySlug ? `?categorySlug=${encodeURIComponent(categorySlug)}` : '';
      const list = await api<LibraryItem[]>(`/media/library${q}`, {
        token: token || undefined,
      });
      setItems(list);
    } catch {
      setItems([]);
    }
  }, [categorySlug, token]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setGroupFilter(null);
      load();
    }
  }, [open, load]);

  const groups = useMemo(
    () =>
      groupMediaLibrary(items as Parameters<typeof groupMediaLibrary>[0], {
        search,
        groupId: groupFilter,
      }),
    [items, search, groupFilter],
  );

  const allGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.categoryGroup)) {
        seen.set(
          item.categoryGroup,
          item.groupLabel || mediaLibraryGroupLabel(item.categoryGroup),
        );
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [items]);

  async function pickFromDevice() {
    if (!token) {
      setError('Sign in required to upload');
      return;
    }
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const uploaded = await uploadMedia(
        {
          uri: asset.uri,
          name: asset.fileName || 'logo.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        { token },
      );
      onChange(uploaded.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (!token) {
      setError('Sign in required to upload');
      return;
    }
    setError('');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const uploaded = await uploadMedia(
        {
          uri: asset.uri,
          name: 'camera-logo.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        { token },
      );
      onChange(uploaded.url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <View style={s.previewRow}>
        <View style={s.thumb}>
          {value ? (
            <LogoImage uri={value} size={64} borderRadius={32} />
          ) : (
            <Text style={s.thumbPlaceholder}>Logo</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <PrimaryButton label="Choose logo" onPress={() => setOpen(true)} />
          {!!value && (
            <Pressable onPress={() => onChange('')}>
              <Text style={s.remove}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
          <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Business logo</Text>
          <Text style={s.sub}>Pick from Stamp Perk library or upload your own photo.</Text>

          <View style={s.tabs}>
            <Pressable
              onPress={() => setTab('library')}
              style={[s.tab, tab === 'library' && s.tabOn]}
            >
              <Text style={tab === 'library' ? s.tabTextOn : s.tabText}>Library</Text>
            </Pressable>
            <Pressable onPress={() => setTab('upload')} style={[s.tab, tab === 'upload' && s.tabOn]}>
              <Text style={tab === 'upload' ? s.tabTextOn : s.tabText}>Upload</Text>
            </Pressable>
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}
          {busy && <ActivityIndicator color={colors.coral} style={{ marginVertical: 12 }} />}

          {tab === 'library' && (
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search icons…"
                placeholderTextColor={colors.muted}
                style={s.search}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipScroll}
                contentContainerStyle={s.chipRow}
              >
                <Pressable
                  onPress={() => setGroupFilter(null)}
                  style={[s.chip, !groupFilter && s.chipOn]}
                >
                  <Text style={!groupFilter ? s.chipTextOn : s.chipText}>All</Text>
                </Pressable>
                {allGroups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupFilter(g.id === groupFilter ? null : g.id)}
                    style={[s.chip, groupFilter === g.id && s.chipOn]}
                  >
                    <Text style={groupFilter === g.id ? s.chipTextOn : s.chipText}>{g.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {groups.map((group) => (
                <View key={group.id} style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>{group.label}</Text>
                    <Text style={s.sectionCount}>{group.items.length}</Text>
                  </View>
                  <View style={s.grid}>
                    {group.items.map((item) => {
                      const itemPath =
                        (item as { path?: string }).path ||
                        (() => {
                          const abs = (item as LibraryItem & { url?: string }).url;
                          if (!abs) return '';
                          try {
                            return new URL(abs).pathname;
                          } catch {
                            return abs;
                          }
                        })();
                      const previewUrl = resolveMediaUrl(itemPath) || '';
                      const selected =
                        !!value &&
                        (value === itemPath ||
                          value === previewUrl ||
                          resolveMediaUrl(value) === previewUrl);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            if (!itemPath) return;
                            // Store relative library path so LAN/host changes don't break logos.
                            onChange(itemPath);
                            setOpen(false);
                          }}
                          style={[s.cell, selected && s.cellOn]}
                        >
                          <View style={{ marginBottom: 6 }}>
                            <LogoImage uri={itemPath || previewUrl} size={56} borderRadius={14} />
                          </View>
                          <Text style={s.cellLabel} numberOfLines={1}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {!groups.length && (
                <Text style={s.sub}>
                  {search || groupFilter
                    ? 'No icons match your search.'
                    : 'No library icons yet. Try Upload instead.'}
                </Text>
              )}
            </ScrollView>
          )}

          {tab === 'upload' && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <PrimaryButton label="Choose from photos" onPress={pickFromDevice} disabled={busy} />
              <PrimaryButton label="Take photo" outline onPress={takePhoto} disabled={busy} />
              <Text style={s.sub}>JPEG, PNG, or WebP · max 2 MB · square crop recommended</Text>
            </View>
          )}

          <PrimaryButton label="Close" outline onPress={() => setOpen(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { fontWeight: '800', color: colors.muted, fontSize: 12 },
  remove: { color: colors.coral, fontWeight: '700', textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
    marginTop: 'auto',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.pink,
  },
  tabOn: { backgroundColor: colors.coral },
  tabText: { fontWeight: '700', color: colors.ink },
  tabTextOn: { fontWeight: '700', color: '#fff' },
  search: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 10,
  },
  chipScroll: { marginBottom: 12, maxHeight: 40 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F4F5F7',
  },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  chipTextOn: { fontSize: 12, fontWeight: '700', color: '#fff' },
  section: { marginBottom: 16 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  sectionCount: { fontSize: 11, fontWeight: '700', color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '30%',
    flexGrow: 1,
    maxWidth: '32%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#F8F8FA',
  },
  cellOn: { borderColor: colors.coral, backgroundColor: '#FFF5F6' },
  cellImg: { width: 56, height: 56, borderRadius: 14, marginBottom: 6 },
  cellLabel: { fontSize: 11, fontWeight: '700', color: colors.ink },
  error: { color: '#DC2626', fontWeight: '700', marginBottom: 8 },
});
